package in.sortedsolutions.technician;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Calendar;
import java.util.Locale;

public class BackgroundLocationService extends Service {

    private static final String CHANNEL_ID = "GPS_Service_Channel";
    private static final String PREFS_NAME = "SortedSolutionsGPS";
    private static final String KEY_TECH_ID = "technician_id";
    private static final long PING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    private LocationManager locationManager;
    private LocationListener locationListener;
    private PowerManager.WakeLock wakeLock;
    private Location lastLocation;
    private Handler handler;
    private Runnable pingRunnable;
    private boolean isTracking = false;

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        handler = new Handler(Looper.getMainLooper());

        locationListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                if (location != null) {
                    lastLocation = location;
                }
            }
            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {}
            @Override
            public void onProviderEnabled(String provider) {}
            @Override
            public void onProviderDisabled(String provider) {}
        };

        // Create CPU WakeLock to keep the service running in Doze Mode
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SortedSolutions::GPSWakeLock");
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // 1. Check working hours (8:00 AM - 8:00 PM)
        Calendar now = Calendar.getInstance();
        int hour = now.get(Calendar.HOUR_OF_DAY);
        if (hour < 8 || hour >= 20) {
            // Outside working hours: stop immediately
            GPSBridgePlugin.scheduleAlarms(this);
            stopSelf();
            return START_NOT_STICKY;
        }

        // 2. Check if technician ID exists
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String technicianId = prefs.getString(KEY_TECH_ID, "");
        if (technicianId.isEmpty()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (!isTracking) {
            isTracking = true;

            // 3. Start foreground notification
            createNotificationChannel();
            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Sorted Solutions GPS Active")
                .setContentText("Tracking location for job dispatching.")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .build();

            startForeground(1, notification);

            // Acquire WakeLock
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire();
            }

            // 4. Request location updates
            startLocationUpdates();

            // 5. Start periodic 5-minute pings
            startPeriodicPings(technicianId);
        }

        return START_STICKY;
    }

    private void startLocationUpdates() {
        try {
            if (locationManager != null) {
                // Query GPS provider
                if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        30000, // min time 30s to keep cache warm
                        10,    // min distance 10m
                        locationListener
                    );
                    Location loc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                    if (loc != null) lastLocation = loc;
                }
                // Query Network provider (fallback for indoor tracking)
                if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                    locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        30000,
                        10,
                        locationListener
                    );
                    Location loc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                    if (loc != null && (lastLocation == null || loc.getTime() > lastLocation.getTime())) {
                        lastLocation = loc;
                    }
                }
            }
        } catch (SecurityException e) {
            e.printStackTrace();
        }
    }

    private void startPeriodicPings(final String technicianId) {
        pingRunnable = new Runnable() {
            @Override
            public void run() {
                // 1. Double check business hours
                Calendar now = Calendar.getInstance();
                int hour = now.get(Calendar.HOUR_OF_DAY);
                if (hour < 8 || hour >= 20) {
                    // Stop service if we hit 8:00 PM
                    GPSBridgePlugin.scheduleAlarms(BackgroundLocationService.this);
                    stopSelf();
                    return;
                }

                // 2. Perform HTTP ping
                final Location loc = lastLocation;
                if (loc != null) {
                    new Thread(new Runnable() {
                        @Override
                        public void run() {
                            sendLocationToServer(technicianId, loc.getLatitude(), loc.getLongitude());
                        }
                    }).start();
                } else {
                    // Try to get fresh last known location
                    startLocationUpdates();
                    if (lastLocation != null) {
                        new Thread(new Runnable() {
                            @Override
                            public void run() {
                                sendLocationToServer(technicianId, lastLocation.getLatitude(), lastLocation.getLongitude());
                            }
                        }).start();
                    }
                }

                // 3. Schedule next run in 5 minutes
                handler.postDelayed(this, PING_INTERVAL_MS);
            }
        };

        // Run immediately on start, then every 5 minutes
        handler.post(pingRunnable);
    }

    private void sendLocationToServer(String technicianId, double lat, double lng) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL("https://sortedsolutions.in/api/technician/location");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; utf-8");
            conn.setRequestProperty("Accept", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);

            String jsonPayload = String.format(
                Locale.US,
                "{\"technician_id\":\"%s\",\"latitude\":%f,\"longitude\":%f,\"is_on_job\":false,\"tracking_source\":\"native_service\"}",
                technicianId, lat, lng
            );

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonPayload.getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            // Success or failure log
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                CHANNEL_ID,
                "GPS Tracker Channel",
                NotificationManager.IMPORTANCE_MIN
            );
            serviceChannel.setDescription("Required background location notification");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isTracking = false;
        if (handler != null && pingRunnable != null) {
            handler.removeCallbacks(pingRunnable);
        }
        if (locationManager != null && locationListener != null) {
            locationManager.removeUpdates(locationListener);
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
