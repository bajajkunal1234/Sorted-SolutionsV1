package in.sortedsolutions.technician;

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
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.PermissionCallback;
import android.Manifest;

@CapacitorPlugin(
    name = "GPSBridgePlugin",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class GPSBridgePlugin extends Plugin {

    private static final String PREFS_NAME = "SortedSolutionsGPS";
    private static final String KEY_TECH_ID = "technician_id";
    private static final String KEY_SESSION_TOKEN = "session_token";

    private void startBackgroundServiceInternal() {
        Context context = getContext();
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

    @PluginMethod
    public void setTechnicianId(PluginCall call) {
        String id = call.getString("id");
        String sessionToken = call.getString("sessionToken");
        if (id == null || id.isEmpty()) {
            call.reject("Technician ID is required");
            return;
        }

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(KEY_TECH_ID, id);
        if (sessionToken != null) {
            editor.putString(KEY_SESSION_TOKEN, sessionToken);
        } else {
            editor.remove(KEY_SESSION_TOKEN);
        }
        editor.apply();

        if (getPermissionState("location") == PermissionState.GRANTED) {
            startBackgroundServiceInternal();
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
        }
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            startBackgroundServiceInternal();
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            call.reject("Location permission is required for tracking");
        }
    }

    @PluginMethod
    public void setOnlineStatus(PluginCall call) {
        Boolean isOnline = call.getBoolean("isOnline");
        if (isOnline == null) {
            isOnline = true;
        }
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean("is_online", isOnline).apply();

        // Trigger onStartCommand to apply location listener changes immediately
        String techId = prefs.getString(KEY_TECH_ID, "");
        if (!techId.isEmpty()) {
            if (getPermissionState("location") == PermissionState.GRANTED) {
                startBackgroundServiceInternal();
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
        prefs.edit().remove(KEY_TECH_ID).remove(KEY_SESSION_TOKEN).apply();

        // Stop background location service immediately
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
    public void getCurrentLocation(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Location permission not granted");
            return;
        }

        Context context = getContext();
        LocationManager locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (locationManager == null) {
            call.reject("Location manager not available");
            return;
        }

        try {
            android.location.Location gpsLoc = null;
            android.location.Location netLoc = null;

            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                gpsLoc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                netLoc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            }

            android.location.Location finalLoc = null;
            if (gpsLoc != null && netLoc != null) {
                if (gpsLoc.getTime() > netLoc.getTime()) {
                    finalLoc = gpsLoc;
                } else {
                    finalLoc = netLoc;
                }
            } else {
                finalLoc = gpsLoc != null ? gpsLoc : netLoc;
            }

            if (finalLoc != null) {
                JSObject ret = new JSObject();
                ret.put("latitude", finalLoc.getLatitude());
                ret.put("longitude", finalLoc.getLongitude());
                ret.put("accuracy", finalLoc.getAccuracy());
                call.resolve(ret);
            } else {
                final LocationManager lm = locationManager;
                getBridge().getActivity().runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            String provider = lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ? LocationManager.GPS_PROVIDER : LocationManager.NETWORK_PROVIDER;
                            lm.requestSingleUpdate(provider, new android.location.LocationListener() {
                                @Override
                                public void onLocationChanged(android.location.Location location) {
                                    JSObject ret = new JSObject();
                                    ret.put("latitude", location.getLatitude());
                                    ret.put("longitude", location.getLongitude());
                                    ret.put("accuracy", location.getAccuracy());
                                    call.resolve(ret);
                                }
                                @Override
                                public void onStatusChanged(String provider, int status, android.os.Bundle extras) {}
                                @Override
                                public void onProviderEnabled(String provider) {}
                                @Override
                                public void onProviderDisabled(String provider) {}
                            }, null);
                        } catch (SecurityException se) {
                            call.reject("Permission error: " + se.getMessage());
                        } catch (Exception ex) {
                            call.reject("GPS Error: " + ex.getMessage());
                        }
                    }
                });
            }
        } catch (SecurityException se) {
            call.reject("Permission error: " + se.getMessage());
        } catch (Exception e) {
            call.reject("GPS Error: " + e.getMessage());
        }
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

    @PluginMethod
    public void checkAndRequestBatteryOptimization(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.os.PowerManager pm = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                boolean isIgnoring = pm.isIgnoringBatteryOptimizations(context.getPackageName());
                ret.put("isIgnoring", isIgnoring);
                if (!isIgnoring) {
                    try {
                        Intent intent = new Intent();
                        intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(android.net.Uri.parse("package:" + context.getPackageName()));
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
        } else {
            ret.put("isIgnoring", true);
        }
        call.resolve(ret);
    }
}
