package in.sortedsolutions.technician;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.util.Calendar;

public class AlarmReceiver extends BroadcastReceiver {

    private static final String PREFS_NAME = "SortedSolutionsGPS";
    private static final String KEY_TECH_ID = "technician_id";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String technicianId = prefs.getString(KEY_TECH_ID, "");

        // If no technician is logged in, do nothing and do not reschedule
        if (technicianId.isEmpty()) {
            GPSBridgePlugin.cancelAlarms(context);
            return;
        }

        if ("START_TRACKING".equals(action)) {
            // Start the background tracking service
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
        } else if ("STOP_TRACKING".equals(action)) {
            // Stop the background tracking service
            Intent serviceIntent = new Intent(context, BackgroundLocationService.class);
            context.stopService(serviceIntent);
        }

        // Reschedule alarms for the next cycle
        GPSBridgePlugin.scheduleAlarms(context);
    }
}
