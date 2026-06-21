package in.sortedsolutions.technician;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.LocationManager;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Calendar;

@CapacitorPlugin(name = "GPSBridgePlugin")
public class GPSBridgePlugin extends Plugin {

    private static final String PREFS_NAME = "SortedSolutionsGPS";
    private static final String KEY_TECH_ID = "technician_id";

    @PluginMethod
    public void setTechnicianId(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("Technician ID is required");
            return;
        }

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_TECH_ID, id).apply();

        // 1. Schedule daily start/stop alarms
        scheduleAlarms(context);

        // 2. Start service immediately if currently within 8:00 AM - 8:00 PM working hours
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

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearTechnicianId(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(KEY_TECH_ID).apply();

        // 1. Cancel all scheduled alarms
        cancelAlarms(context);

        // 2. Stop service immediately if running
        Intent serviceIntent = new Intent(context, BackgroundLocationService.class);
        context.stopService(serviceIntent);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void isGpsEnabled(PluginCall call) {
        Context context = getContext();
        LocationManager locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        boolean enabled = false;
        if (locationManager != null) {
            enabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
        }

        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open location settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            android.net.Uri uri = android.net.Uri.fromParts("package", context.getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open app settings: " + e.getMessage());
        }
    }

    public static void scheduleAlarms(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        // Intent to start service
        Intent startIntent = new Intent(context, AlarmReceiver.class);
        startIntent.setAction("START_TRACKING");
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent startPendingIntent = PendingIntent.getBroadcast(
            context, 101, startIntent, flags
        );

        // Intent to stop service
        Intent stopIntent = new Intent(context, AlarmReceiver.class);
        stopIntent.setAction("STOP_TRACKING");
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
            context, 102, stopIntent, flags
        );

        // Schedule start at 8:00 AM daily
        Calendar startCal = Calendar.getInstance();
        startCal.set(Calendar.HOUR_OF_DAY, 8);
        startCal.set(Calendar.MINUTE, 0);
        startCal.set(Calendar.SECOND, 0);
        startCal.set(Calendar.MILLISECOND, 0);
        if (startCal.getTimeInMillis() < System.currentTimeMillis()) {
            startCal.add(Calendar.DAY_OF_YEAR, 1);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP, startCal.getTimeInMillis(), startPendingIntent
            );
        } else {
            alarmManager.set(
                AlarmManager.RTC_WAKEUP, startCal.getTimeInMillis(), startPendingIntent
            );
        }

        // Schedule stop at 8:00 PM daily
        Calendar stopCal = Calendar.getInstance();
        stopCal.set(Calendar.HOUR_OF_DAY, 20);
        stopCal.set(Calendar.MINUTE, 0);
        stopCal.set(Calendar.SECOND, 0);
        stopCal.set(Calendar.MILLISECOND, 0);
        if (stopCal.getTimeInMillis() < System.currentTimeMillis()) {
            stopCal.add(Calendar.DAY_OF_YEAR, 1);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP, stopCal.getTimeInMillis(), stopPendingIntent
            );
        } else {
            alarmManager.set(
                AlarmManager.RTC_WAKEUP, stopCal.getTimeInMillis(), stopPendingIntent
            );
        }
    }

    public static void cancelAlarms(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        int flags = PendingIntent.FLAG_NO_CREATE;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        Intent startIntent = new Intent(context, AlarmReceiver.class);
        startIntent.setAction("START_TRACKING");
        PendingIntent startPendingIntent = PendingIntent.getBroadcast(
            context, 101, startIntent, flags
        );
        if (startPendingIntent != null) {
            alarmManager.cancel(startPendingIntent);
            startPendingIntent.cancel();
        }

        Intent stopIntent = new Intent(context, AlarmReceiver.class);
        stopIntent.setAction("STOP_TRACKING");
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
            context, 102, stopIntent, flags
        );
        if (stopPendingIntent != null) {
            alarmManager.cancel(stopPendingIntent);
            stopPendingIntent.cancel();
        }
    }
}
