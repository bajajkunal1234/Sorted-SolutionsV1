import { useRef, useState } from 'react';
import { Download, Upload, Loader2, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

/**
 * Reusable Import/Export buttons for tables.
 * 
 * @param {Array} data - The array of current data objects for export.
 * @param {Array} columns - The array of column definitions (e.g. {id, label}) for export mapping.
 * @param {String} exportFilename - Base name for the exported file.
 * @param {Function} onImport - Async callback invoked with parsed JSON array of uploaded rows.
 */
export default function ImportExportButtons({ data = [], columns = [], exportFilename = 'export', onImport }) {
    const fileInputRef = useRef(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleDownloadTemplate = () => {
        if (!columns.length) return alert('No template columns available.');
        
        // Generate a single empty row mapping to column headers
        const templateRow = {};
        columns.forEach(col => {
            templateRow[col.label || col.id] = '';
        });

        const worksheet = XLSX.utils.json_to_sheet([templateRow]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
        
        XLSX.writeFile(workbook, `${exportFilename}_Template.xlsx`);
    };

    const handleExport = () => {
        if (!data.length || !columns.length) return alert('No data to export.');
        
        // Transform the data array into a format matching the visible columns
        const exportData = data.map(item => {
            const row = {};
            columns.forEach(col => {
                // Get value loosely. Fallback to extracting from item directly by col.id
                let val = item[col.id];
                
                // Specific common formatting cleanly done
                if (val !== null && val !== undefined) {
                    if (typeof val === 'boolean') {
                        val = val ? 'Yes' : 'No';
                    } else if (Array.isArray(val) || typeof val === 'object') {
                        val = JSON.stringify(val); // Fallback for nested objects
                    }
                }
                
                // Format dates lightly if we detect them
                if (col.id.includes('date') || col.id === 'created_at') {
                    if (val && new Date(val).getTime() > 0) {
                        try {
                           val = new Date(val).toLocaleString('en-GB'); 
                        } catch(e) {}
                    }
                }
                
                row[col.label || col.id] = val !== undefined && val !== null ? val : '';
            });
            return row;
        });

        // Generate Excel Worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        
        // Export file
        const timestamp = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `${exportFilename}_${timestamp}.xlsx`);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset the input value so user can upload the same file again if needed
        e.target.value = '';

        try {
            setIsImporting(true);
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON, using headers
            const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            
            if (!rawData.length) {
                alert('No data found in the selected Excel file.');
                setIsImporting(false);
                return;
            }

            // Map the parsed JSON's UI-friendly column Labels BACK into database column IDs
            // based on the provided columns prop.
            const mappedData = rawData.map(row => {
                const mappedRow = {};
                for (const [key, val] of Object.entries(row)) {
                    // Try to find a matching column config
                    const colConfig = columns.find(c => c.label === key || c.id === key);
                    
                    if (colConfig) {
                        mappedRow[colConfig.id] = val;
                    } else {
                         // Preserve unrecognized columns just in case the importer explicitly needs them
                         const slugKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
                         mappedRow[slugKey] = val;
                    }
                }
                return mappedRow;
            });

            if (onImport) {
                await onImport(mappedData);
            }
        } catch (error) {
            console.error('Import file parsing failed:', error);
            alert('Failed to parse the Excel file. Ensure it is a valid `.xlsx` format.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
                type="file" 
                accept=".xlsx, .xls"
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
            />
            
            <button
                onClick={handleDownloadTemplate}
                disabled={isImporting}
                title="Download Import Template"
                style={{ 
                    padding: '5px 10px', 
                    fontSize: '12px', 
                    cursor: isImporting ? 'not-allowed' : 'pointer', 
                    border: '1px solid var(--border-primary)', 
                    borderRadius: '6px', 
                    backgroundColor: 'transparent', 
                    color: isImporting ? '#64748b' : '#8b5cf6', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    transition: 'all 0.15s' 
                }}
                onMouseEnter={e => !isImporting && (e.currentTarget.style.backgroundColor = '#8b5cf615')}
                onMouseLeave={e => !isImporting && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
                <FileDown size={13} /> Template
            </button>
            
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                title="Import via Excel"
                style={{ 
                    padding: '5px 10px', 
                    fontSize: '12px', 
                    cursor: isImporting ? 'wait' : 'pointer', 
                    border: '1px solid var(--border-primary)', 
                    borderRadius: '6px', 
                    backgroundColor: 'transparent', 
                    color: isImporting ? '#64748b' : '#3b82f6', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    transition: 'all 0.15s' 
                }}
                onMouseEnter={e => !isImporting && (e.currentTarget.style.backgroundColor = '#3b82f615')}
                onMouseLeave={e => !isImporting && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
                {isImporting ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Import
            </button>
            
            <button
                onClick={handleExport}
                disabled={isImporting}
                title="Export to Excel"
                style={{ 
                    padding: '5px 10px', 
                    fontSize: '12px', 
                    cursor: isImporting ? 'not-allowed' : 'pointer', 
                    border: '1px solid var(--border-primary)', 
                    borderRadius: '6px', 
                    backgroundColor: 'transparent', 
                    color: isImporting ? '#64748b' : '#10b981', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    transition: 'all 0.15s' 
                }}
                onMouseEnter={e => !isImporting && (e.currentTarget.style.backgroundColor = '#10b98115')}
                onMouseLeave={e => !isImporting && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
                <Download size={13} /> Export
            </button>
        </div>
    );
}
