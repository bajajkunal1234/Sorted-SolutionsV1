package in.sortedsolutions.technician;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.util.Calendar;

public class BootReceiver extends BroadcastReceiver {

    private static final String PREFS_NAME = "SortedSolutionsGPS";
    private static final String KEY_TECH_ID = "technician_id";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String technicianId = prefs.getString(KEY_TECH_ID, "");

            // If a technician is logged in, restore alarms
            if (!technicianId.isEmpty()) {
                GPSBridgePlugin.scheduleAlarms(context);

                // Start service immediately if currently inside working hours (8:00 AM - 8:00 PM)
                Calendar now = Calendar.getInstance();
                int hour = now.get(Calendar.HOUR_OF_DAY);
                if (hour >= 8 && hour < 20) {
                    Intent serviceIntent = new Intent(context, BackgroundLocationService.class);
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            context.startForegroundService(serviceIntent);
                        } else {
                            context.startService(serviceIntent);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }
}
