const { supabase } = require('../lib/supabase');

async function testRoute() {
    const technicianId = "3c593991-902e-42a6-b0f3-5b74ea22691d";
    
    console.log("Fetching technician from database...");
    const { data: technician, error } = await supabase
        .from('technicians')
        .select('id, name, email, phone, is_active, created_at, current_session_token, weekly_off_day, mdm_device_id')
        .eq('id', technicianId)
        .single();
        
    if (error) {
        console.error("DB Error:", error);
        return;
    }
    
    console.log("Technician:", technician);
    
    let mdmProfiles = null;
    if (technician.mdm_device_id) {
        console.log("Fetching MDM profiles for device ID:", technician.mdm_device_id);
        const { getDeviceProfiles } = require('../lib/manageEngine');
        try {
            const res = await getDeviceProfiles(technician.mdm_device_id);
            console.log("MDM Response:", res);
            if (res && res.profiles) {
                mdmProfiles = res.profiles;
                
                // Self-healing check
                const { data: liveLoc } = await supabase
                    .from('technician_live_locations')
                    .select('is_online')
                    .eq('technician_id', technicianId)
                    .maybeSingle();

                const isOnline = liveLoc ? liveLoc.is_online === true : false;
                console.log("Is Online (Live Location):", isOnline);
                
                const onDutyProfileId = process.env.MANAGEENGINE_ON_DUTY_PROFILE_ID || "51167000000097017";
                const offDutyProfileId = process.env.MANAGEENGINE_OFF_DUTY_PROFILE_ID || "5116700000101018";
                
                console.log("Profiles is array?", Array.isArray(mdmProfiles));
                const hasOnDuty = mdmProfiles.some(p => p.profile_id === onDutyProfileId);
                const hasOffDuty = mdmProfiles.some(p => p.profile_id === offDutyProfileId);
                console.log("Has On Duty:", hasOnDuty, "Has Off Duty:", hasOffDuty);
            }
        } catch (err) {
            console.error("MDM Error:", err);
        }
    }
    
    console.log("Test finished successfully!");
}

testRoute().catch(console.error);
