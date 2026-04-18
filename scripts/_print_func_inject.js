    const handlePrintItem = (item, tab) => {
        const ref       = item.invoice_number || item.quote_number || item.receipt_number || item.payment_number || item.id || '';
        const acct      = item.account_name || '';
        const acctPhone = item.account_phone || '';
        const acctGSTIN = item.account_gstin || '';
        const acctAddr  = item.billing_address || '';
        const date      = item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const amount    = item.total_amount || item.amount || 0;
        const itemsList = Array.isArray(item.items) ? item.items : [];

        const ps           = printSettingsRef.current || {};
        const companyName  = ps.company_name    || 'Your Company';
        const companyAddr  = ps.company_address || '';
        const companyPhone = ps.company_phone   || '';
        const companyEmail = ps.company_email   || '';
        const companyWeb   = ps.website         || '';
        const companyGstin = ps.gst_number      || '';
        const showLogo     = ps.show_logo !== false;
        const logoUrl      = showLogo && ps.logo_url ? ps.logo_url : null;
        const showGST      = ps.show_gst !== false;
        const showTerms    = ps.show_terms !== false;
        const showSig      = ps.include_signature !== false;
        const tStyle       = ps.template_style || 'modern-boxes';
        const fSz          = ps.font_size === 'small' ? '11px' : ps.font_size === 'large' ? '15px' : '13px';
        const pageSize     = (ps.paper_size === 'A5' ? 'A5' : ps.paper_size === 'Letter' ? 'letter' : 'A4');

        const termsMap = { sales: 'invoice_terms', purchases: 'invoice_terms', quotations: 'quotation_terms', rentals: 'rental_terms', amc: 'amc_terms' };
        const terms = Array.isArray(ps[termsMap[tab] || 'invoice_terms']) ? ps[termsMap[tab] || 'invoice_terms'] : [];
        const docTitle = tab === 'quotations' ? 'QUOTATION' : tab === 'purchases' ? 'PURCHASE INVOICE' : 'TAX INVOICE';

        // Tally-style GST from saved invoice fields
        const cgstAmt = Number(item.cgst || 0);
        const sgstAmt = Number(item.sgst || 0);
        const igstAmt = Number(item.igst || 0);
        const totalTax = cgstAmt + sgstAmt + igstAmt;
        const taxableBase = Number(amount) - totalTax;

        const effRate = (amt) => {
            if (amt <= 0 || taxableBase <= 0) return '';
            const r = (amt / taxableBase) * 100;
            return r % 1 === 0 ? r.toFixed(0) : r.toFixed(1);
        };

        const rateIncl = (it) => {
            const qty = Number(it.qty || it.quantity || 1);
            const tot = Number(it.total || it.amount || 0);
            return qty > 0 ? tot / qty : 0;
        };

        const hsnMap = {};
        itemsList.forEach(it => {
            if (it.hsn && !hsnMap[it.hsn]) hsnMap[it.hsn] = { desc: it.description || it.name || '', taxRate: it.taxRate || 0 };
        });
        const hsnEntries = Object.entries(hsnMap);

        const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const rupee = '&#8377;';

        // ────── SHARED BUILDERS ──────────────────────────────────────────────

        const gStyle = (extra) => `
  @page{size:${pageSize};margin:12mm 10mm}*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;font-size:${fSz}}
  table{border-collapse:collapse;width:100%}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  ${extra}`;

        const logoTag = (inv) => logoUrl
            ? `<img src="${logoUrl}" alt="Logo" style="height:44px;max-width:140px;object-fit:contain;margin-bottom:8px;display:block${inv ? ';filter:brightness(0) invert(1)' : ''}">`
            : '';

        const billToBlock = (nameColor, phoneColor, addrColor) => `
  <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;margin-bottom:5px">Bill To</div>
  <div style="font-size:14px;font-weight:800;color:${nameColor}">${acct}</div>
  ${acctPhone ? `<div style="font-size:11px;color:${phoneColor};margin-top:3px">&#128222; ${acctPhone}</div>` : ''}
  ${acctAddr  ? `<div style="font-size:10px;color:${addrColor};margin-top:3px;line-height:1.5">${acctAddr}</div>` : ''}
  ${acctGSTIN ? `<div style="font-size:9.5px;color:${addrColor};margin-top:3px;font-family:monospace">GSTIN: ${acctGSTIN}</div>` : ''}`;

        const thead = (bg, color) => `
  <thead><tr style="background:${bg};color:${color}">
    <th style="padding:8px 10px;text-align:left;font-size:11px">#</th>
    <th style="padding:8px 10px;text-align:left;font-size:11px">Service / Product</th>
    <th style="padding:8px 10px;text-align:center;font-size:11px">HSN/SAC</th>
    <th style="padding:8px 10px;text-align:center;font-size:11px">Qty</th>
    <th style="padding:8px 10px;text-align:center;font-size:11px">Unit</th>
    <th style="padding:8px 10px;text-align:right;font-size:11px">Rate (Incl.)</th>
    <th style="padding:8px 10px;text-align:right;font-size:11px">Total</th>
  </tr></thead>`;

        const trows = (bg1, bg2, bd) => itemsList.length === 0
            ? `<tr><td colspan="7" style="padding:18px;text-align:center;color:#94a3b8;font-style:italic">No items</td></tr>`
            : itemsList.map((it, i) => `
  <tr style="background:${i % 2 === 0 ? bg1 : bg2}">
    <td style="padding:8px 10px;border-bottom:1px solid ${bd}">${i + 1}</td>
    <td style="padding:8px 10px;border-bottom:1px solid ${bd};font-weight:500">${it.description || it.name || ''}</td>
    <td style="padding:8px 10px;border-bottom:1px solid ${bd};text-align:center;font-family:monospace;font-size:11px;color:#64748b">${it.hsn || '—'}</td>
    <td style="padding:8px 10px;border-bottom:1px solid ${bd};text-align:center">${it.qty || it.quantity || 1}</td>
    <td style="padding:8px 10px;border-bottom:1px solid ${bd};text-align:center;color:#64748b">${it.unit || 'Nos'}</td>
    <td style="padding:8px 10px;border-bottom:1px solid ${bd};text-align:right">${rupee}${fmt(rateIncl(it))}</td>
    <td style="padding:8px 10px;border-bottom:1px solid ${bd};text-align:right;font-weight:700">${rupee}${fmt(it.total || it.amount || 0)}</td>
  </tr>`).join('');

        const totalsHtml = (accentColor, borderTop) => `
  <div style="display:flex;justify-content:flex-end;margin-top:14px">
    <table style="width:260px">
      <tr style="border-top:1px solid #e2e8f0">
        <td style="padding:6px 0;color:#64748b;font-size:12px">Taxable Amount</td>
        <td style="padding:6px 0;text-align:right;font-size:12px">${rupee}${fmt(taxableBase)}</td>
      </tr>
      ${showGST && cgstAmt > 0 ? `<tr><td style="padding:5px 0;color:#64748b;font-size:12px">CGST${effRate(cgstAmt) ? ' @ ' + effRate(cgstAmt) + '%' : ''}</td><td style="padding:5px 0;text-align:right;font-size:12px">${rupee}${fmt(cgstAmt)}</td></tr>` : ''}
      ${showGST && sgstAmt > 0 ? `<tr><td style="padding:5px 0;color:#64748b;font-size:12px">SGST${effRate(sgstAmt) ? ' @ ' + effRate(sgstAmt) + '%' : ''}</td><td style="padding:5px 0;text-align:right;font-size:12px">${rupee}${fmt(sgstAmt)}</td></tr>` : ''}
      ${showGST && igstAmt > 0 ? `<tr><td style="padding:5px 0;color:#64748b;font-size:12px">IGST${effRate(igstAmt) ? ' @ ' + effRate(igstAmt) + '%' : ''}</td><td style="padding:5px 0;text-align:right;font-size:12px">${rupee}${fmt(igstAmt)}</td></tr>` : ''}
      ${showGST && totalTax > 0 ? `<tr><td style="padding:5px 0;color:#64748b;font-size:12px">Total GST</td><td style="padding:5px 0;text-align:right;font-size:12px;font-weight:600">${rupee}${fmt(totalTax)}</td></tr>` : ''}
      <tr style="border-top:${borderTop}">
        <td style="padding:9px 0 4px;font-size:15px;font-weight:800;color:${accentColor}">Grand Total</td>
        <td style="padding:9px 0 4px;text-align:right;font-size:17px;font-weight:900;color:${accentColor}">${rupee}${fmt(amount)}</td>
      </tr>
      <tr><td colspan="2" style="font-size:9px;color:#94a3b8;text-align:right;padding-top:2px">Amounts in INR &middot; Rates incl. GST</td></tr>
    </table>
  </div>`;

        const hsnBoxHtml = (bg, bd) => hsnEntries.length === 0 ? '' : `
  <div style="margin-top:12px;padding:10px 14px;background:${bg};border:1px solid ${bd};border-radius:6px">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:6px">HSN/SAC Description</div>
    <table>
      <thead><tr style="border-bottom:1px solid ${bd}">
        <th style="padding:3px 6px;font-size:10px;color:#64748b;font-weight:600;text-align:left">HSN/SAC</th>
        <th style="padding:3px 6px;font-size:10px;color:#64748b;font-weight:600;text-align:left">Description</th>
        <th style="padding:3px 6px;font-size:10px;color:#64748b;font-weight:600;text-align:center">GST%</th>
      </tr></thead>
      <tbody>${hsnEntries.map(([h, d]) => `<tr><td style="padding:3px 6px;font-family:monospace;font-size:10px">${h}</td><td style="padding:3px 6px;font-size:10px">${d.desc}</td><td style="padding:3px 6px;text-align:center;font-size:10px">${d.taxRate}%</td></tr>`).join('')}</tbody>
    </table>
  </div>`;

        const termsHtml = (bg, bd, titleColor) => showTerms && terms.length > 0 ? `
  <div style="margin-top:16px;padding:12px 16px;background:${bg};border:1px solid ${bd};border-radius:6px">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${titleColor};margin-bottom:7px">Terms &amp; Conditions</div>
    <ol style="margin:0;padding-left:14px;font-size:10.5px;color:#475569;line-height:1.8">${terms.map(t => `<li>${t}</li>`).join('')}</ol>
  </div>` : '';

        const sigHtml = (accentColor, companyColor) => showSig ? `
  <div style="display:flex;justify-content:space-between;margin-top:30px">
    <div style="text-align:center"><div style="width:170px;height:48px;border-bottom:1px solid #cbd5e1;margin-bottom:6px"></div><div style="font-size:11px;font-weight:600;color:#475569">Customer Signature</div></div>
    <div style="text-align:center"><div style="width:170px;height:48px;border-bottom:1px solid #cbd5e1;margin-bottom:6px"></div><div style="font-size:11px;font-weight:600;color:${companyColor}">For ${companyName}</div><div style="font-size:9px;color:#94a3b8;margin-top:2px">Authorized Signatory</div></div>
  </div>` : '';

        const footHtml = () => `
  <div style="margin-top:20px;padding:8px 0;border-top:1px solid #e2e8f0;text-align:center;font-size:9.5px;color:#94a3b8">
    Computer-generated document &nbsp;|&nbsp; ${companyName}${companyPhone ? ' &middot; ' + companyPhone : ''}${companyEmail ? ' &middot; ' + companyEmail : ''}${companyWeb ? ' &middot; ' + companyWeb : ''}
  </div>`;

        const wrap = (style, body) => `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>${docTitle} &ndash; ${ref}</title>
<style>${gStyle(style)}</style></head><body>
${body}
<script>window.onload=()=>{setTimeout(()=>window.print(),400)}<\/script>
</body></html>`;

        // ════════════════════════════════════════════════
        // TEMPLATE 1 — ECLIPSE  (Midnight Gradient + Gold)
        // ════════════════════════════════════════════════
        const eclipse = () => {
            const G = '#0f172a', gold = '#f59e0b';
            return wrap('', `
<div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#1e3a5f 100%);padding:26px 32px 20px;position:relative;overflow:hidden">
  <div style="position:absolute;top:-30px;right:-30px;width:150px;height:150px;background:${gold};opacity:0.07;border-radius:50%"></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative">
    <div>
      ${logoTag(true)}
      <div style="font-size:21px;font-weight:900;color:#fff">${companyName}</div>
      ${companyAddr ? `<div style="font-size:10px;color:rgba(255,255,255,0.55);margin-top:4px;line-height:1.5;max-width:270px">${companyAddr}</div>` : ''}
      <div style="font-size:10px;color:rgba(255,255,255,0.55);margin-top:3px">${[companyPhone, companyEmail].filter(Boolean).join(' &middot; ')}</div>
      ${showGST && companyGstin ? `<div style="font-size:9.5px;color:${gold};margin-top:3px;font-family:monospace">GSTIN: ${companyGstin}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:900;color:${gold};letter-spacing:2px">${docTitle}</div>
      <div style="margin-top:8px;background:rgba(255,255,255,0.06);border-radius:8px;padding:10px 14px;border:1px solid rgba(245,158,11,0.25)">
        <div style="color:rgba(255,255,255,0.45);font-size:9px;text-transform:uppercase;letter-spacing:1px">Invoice No.</div>
        <div style="color:#fff;font-size:13px;font-weight:700;margin-top:2px">${ref}</div>
        <div style="color:rgba(255,255,255,0.45);font-size:9px;text-transform:uppercase;letter-spacing:1px;margin-top:5px">Date</div>
        <div style="color:#fff;font-size:12px;font-weight:600;margin-top:2px">${date}</div>
      </div>
    </div>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:3px solid ${gold}">
  <div style="padding:14px 20px 14px 32px;border-right:1px solid #e2e8f0">${billToBlock(G, '#475569', '#64748b')}</div>
  <div style="padding:14px 32px 14px 20px">
    <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;margin-bottom:5px">Grand Total</div>
    <div style="font-size:28px;font-weight:900;color:${gold}">${rupee}${fmt(amount)}</div>
    <div style="font-size:10px;color:#64748b;margin-top:2px">Incl. all taxes</div>
  </div>
</div>
<div style="padding:14px 32px">
  <table>${thead(G, '#fff')}<tbody style="border:1px solid #e2e8f0">${trows('#fafafa', '#fff', '#e2e8f0')}</tbody></table>
  ${totalsHtml(gold, '2px solid ' + gold)}
  ${hsnBoxHtml('#fef9ec', '#fde68a')}
  ${termsHtml('#f8fafc', '#e2e8f0', '#94a3b8')}
  ${sigHtml(gold, G)}
  ${footHtml()}
</div>`);
        };

        // ════════════════════════════════════════════════
        // TEMPLATE 2 — SAFFRON PRO  (Warm Indian Aesthetic)
        // ════════════════════════════════════════════════
        const saffronPro = () => {
            const S = '#ea580c', W = '#fff7ed', L = '#fed7aa', D = '#431407';
            return wrap('', `
<div style="background:linear-gradient(90deg,${S},#c2410c);padding:18px 32px;display:flex;justify-content:space-between;align-items:center">
  <div style="display:flex;align-items:center;gap:14px">
    ${logoTag(true)}
    <div>
      <div style="font-size:20px;font-weight:900;color:#fff">${companyName}</div>
      ${showGST && companyGstin ? `<div style="font-size:9px;color:rgba(255,255,255,0.8);font-family:monospace">GSTIN: ${companyGstin}</div>` : ''}
    </div>
  </div>
  <div style="background:rgba(255,255,255,0.16);border-radius:6px;padding:6px 14px;border:1px solid rgba(255,255,255,0.3);text-align:right">
    <div style="font-size:17px;font-weight:900;color:#fff;letter-spacing:1.5px">${docTitle}</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:2px">${ref} &middot; ${date}</div>
  </div>
</div>
<div style="background:#fff8f0;border-top:3px solid ${L};padding:8px 32px;font-size:9.5px;color:#92400e;display:flex;gap:20px;flex-wrap:wrap">
  <span>${companyAddr}</span>
  <span>${[companyPhone, companyEmail].filter(Boolean).join(' &middot; ')}</span>
</div>
<div style="background:${W};border-bottom:2px solid ${L};padding:12px 32px;display:flex;gap:40px;flex-wrap:wrap;align-items:flex-start">
  <div>${billToBlock(D, '#78350f', '#92400e')}</div>
  <div style="margin-left:auto;text-align:right">
    <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${S};margin-bottom:4px">Amount Due</div>
    <div style="font-size:26px;font-weight:900;color:${S}">${rupee}${fmt(amount)}</div>
  </div>
</div>
<div style="padding:14px 32px">
  <table>${thead(S, '#fff')}<tbody>${trows(W, '#fff', L)}</tbody></table>
  ${totalsHtml(S, '2px solid ' + S)}
  ${hsnBoxHtml(W, L)}
  ${termsHtml('#fff8f0', L, S)}
  ${sigHtml(S, S)}
  ${footHtml()}
</div>`);
        };

        // ════════════════════════════════════════════════
        // TEMPLATE 3 — ARCTIC  (Ultra-clean Minimal Cyan)
        // ════════════════════════════════════════════════
        const arctic = () => {
            const C = '#0891b2', CL = '#ecfeff', CB = '#a5f3fc';
            return wrap('', `
<div style="padding:28px 34px 0">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:1px solid #e2e8f0">
    <div>
      ${logoTag(false)}
      <div style="font-size:18px;font-weight:800;color:#0f172a">${companyName}</div>
      ${companyAddr ? `<div style="font-size:10px;color:#94a3b8;margin-top:4px;line-height:1.5;max-width:260px">${companyAddr}</div>` : ''}
      <div style="font-size:10px;color:#94a3b8;margin-top:3px">${[companyPhone, companyEmail].filter(Boolean).join(' &middot; ')}</div>
      ${showGST && companyGstin ? `<div style="font-size:9.5px;color:#64748b;font-family:monospace;margin-top:2px">GSTIN: ${companyGstin}</div>` : ''}
    </div>
    <div>
      <div style="background:${CL};border:1px solid ${CB};border-radius:8px;padding:12px 18px;text-align:right">
        <div style="font-size:11px;font-weight:700;color:${C};letter-spacing:2px;text-transform:uppercase">${docTitle}</div>
        <div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:4px">${ref}</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px">${date}</div>
      </div>
    </div>
  </div>
  <div style="margin:12px 0;padding:12px 16px;background:#f8fafc;border-radius:8px;display:flex;gap:32px;flex-wrap:wrap;align-items:flex-start">
    <div>${billToBlock('#0f172a', '#475569', '#64748b')}</div>
    <div style="margin-left:auto;text-align:right">
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;margin-bottom:4px">Invoice Total</div>
      <div style="font-size:24px;font-weight:900;color:${C}">${rupee}${fmt(amount)}</div>
    </div>
  </div>
  <table>${thead(CL, C)}<tbody>${trows('#fff', '#fafafa', '#e2e8f0')}</tbody></table>
  ${totalsHtml(C, '1px solid ' + C)}
  ${hsnBoxHtml(CL, CB)}
  ${termsHtml('#f8fafc', '#e2e8f0', '#94a3b8')}
  ${sigHtml(C, '#0f172a')}
  ${footHtml()}
</div>`);
        };

        // ════════════════════════════════════════════════
        // TEMPLATE 4 — CRIMSON GRID  (Bold Red Structured)
        // ════════════════════════════════════════════════
        const crimsonGrid = () => {
            const R = '#be123c', RL = '#fff1f2', RB = '#fecdd3', DR = '#881337';
            return wrap(`.gl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${R};margin-bottom:5px}`, `
<div style="border-top:5px solid ${R}">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:18px 32px;border-bottom:1px solid ${RB}">
    <div>
      ${logoTag(false)}
      <div style="font-size:18px;font-weight:900;color:${DR}">${companyName}</div>
      ${companyAddr ? `<div style="font-size:9.5px;color:#64748b;margin-top:3px;line-height:1.5;max-width:280px">${companyAddr}</div>` : ''}
      <div style="font-size:9.5px;color:#64748b;margin-top:3px">${[companyPhone, companyEmail].filter(Boolean).join(' &middot; ')}</div>
      ${showGST && companyGstin ? `<div style="font-size:9.5px;color:#64748b;font-family:monospace;margin-top:2px">GSTIN: ${companyGstin}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:900;color:${R};letter-spacing:1px">${docTitle}</div>
      <div style="margin-top:7px;background:${RL};border:1px solid ${RB};border-radius:6px;padding:8px 12px;display:inline-block">
        <div class="gl">Invoice No.</div>
        <div style="font-size:13px;font-weight:700;color:${DR}">${ref}</div>
        <div class="gl" style="margin-top:5px">Date</div>
        <div style="font-size:12px;font-weight:600;color:${DR}">${date}</div>
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:2px solid ${R}">
    <div style="padding:12px 20px 12px 32px;border-right:1px solid ${RB}">${billToBlock(DR, R, '#64748b')}</div>
    <div style="padding:12px 32px 12px 20px">
      <div class="gl">Invoice Total</div>
      <div style="font-size:28px;font-weight:900;color:${R}">${rupee}${fmt(amount)}</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">Inclusive of all taxes</div>
      ${showGST && totalTax > 0 ? `<div style="font-size:10px;color:#64748b;margin-top:2px">GST: ${rupee}${fmt(totalTax)}</div>` : ''}
    </div>
  </div>
  <div style="padding:14px 32px">
    <table style="border:1px solid ${RB}">${thead(R, '#fff')}<tbody>${trows('#fff', RL, RB)}</tbody></table>
    ${totalsHtml(R, '2px solid ' + R)}
    ${hsnBoxHtml(RL, RB)}
    ${termsHtml(RL, RB, R)}
    ${sigHtml(R, DR)}
    ${footHtml()}
  </div>
</div>`);
        };

        // ── Select and render ────────────────────────────────────────────────
        let html;
        if      (tStyle === 'modern-boxes')  html = eclipse();
        else if (tStyle === 'classic-lines') html = saffronPro();
        else if (tStyle === 'minimal-clean') html = arctic();
        else                                 html = crimsonGrid();

        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
    };

