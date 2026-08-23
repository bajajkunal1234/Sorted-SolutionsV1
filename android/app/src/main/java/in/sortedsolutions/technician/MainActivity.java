package in.sortedsolutions.technician;

import android.os.Bundle;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.View;
import androidx.core.view.ViewCompat;
import com.getcapacitor.BridgeActivity;

import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.util.Base64;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import android.media.MediaScannerConnection;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.content.ContentResolver;
import android.os.Build;
import android.webkit.PermissionRequest;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Prevent screenshots / video recordings of the app (Commented out to allow screenshots)
        /*
        getWindow().setFlags(
            android.view.WindowManager.LayoutParams.FLAG_SECURE,
            android.view.WindowManager.LayoutParams.FLAG_SECURE
        );
        */

        registerPlugin(GPSBridgePlugin.class);
        super.onCreate(savedInstanceState);
        // Set the window background to solid black programmatically to prevent any splash screen image leak
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.BLACK));

        // Create high-importance custom notification channels on launch
        createCustomNotificationChannels();

        // Workaround: Override the default WindowInsetsListener to prevent 
        // the default Capacitor logic from stacking padding on the WebView.
        getBridge().getWebView().post(() -> {
            // Lock text zoom to 100% to ignore system font size changes
            try {
                getBridge().getWebView().getSettings().setTextZoom(100);
                getBridge().getWebView().getSettings().setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
                getBridge().getWebView().getSettings().setDomStorageEnabled(true);
                getBridge().getWebView().getSettings().setDatabaseEnabled(true);

                // Allow microphone and camera access on our remote origin by overriding the chrome client
                getBridge().getWebView().setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(getBridge()) {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        try {
                            String origin = request.getOrigin().toString();
                            if (origin.contains("sortedsolutions.in") || origin.contains("localhost")) {
                                request.grant(request.getResources());
                            } else {
                                super.onPermissionRequest(request);
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                            super.onPermissionRequest(request);
                        }
                    }
                });
            } catch (Exception e) {
                e.printStackTrace();
            }

            // Set up native download listener to intercept and handle downloads directly inside the WebView
            getBridge().getWebView().setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    try {
                        if (url.startsWith("data:")) {
                            handleBase64Download(url, contentDisposition, mimetype);
                        } else {
                            handleHttpDownload(url, userAgent, contentDisposition, mimetype);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        Toast.makeText(getApplicationContext(), "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                }
            });

            View parent = (View) getBridge().getWebView().getParent();
            ViewCompat.setOnApplyWindowInsetsListener(parent, (v, insets) -> {
                v.setPadding(0, 0, 0, 0); // Reset padding to 0 to prevent the WebView from being pushed up/squished
                return insets;
            });
            getBridge().getWebView().requestApplyInsets();
        });
    }

    private void createCustomNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            // Delete old v2 and v3 channels to force recreation with sound
            try {
                manager.deleteNotificationChannel("jobs_v2");
                manager.deleteNotificationChannel("alerta_breaking_bad_v2");
                manager.deleteNotificationChannel("complete_v2");
                manager.deleteNotificationChannel("lg_woodpecker_v2");
                manager.deleteNotificationChannel("milomilo_v2");
                manager.deleteNotificationChannel("money_v2");

                manager.deleteNotificationChannel("jobs_v3");
                manager.deleteNotificationChannel("alerta_breaking_bad_v3");
                manager.deleteNotificationChannel("complete_v3");
                manager.deleteNotificationChannel("lg_woodpecker_v3");
                manager.deleteNotificationChannel("milomilo_v3");
                manager.deleteNotificationChannel("money_v3");
            } catch (Exception e) {
                e.printStackTrace();
            }

            // 1. Create the default "jobs_v3" channel with High Importance
            NotificationChannel jobsChannel = new NotificationChannel(
                "jobs_v3",
                "Default Ringtone",
                NotificationManager.IMPORTANCE_HIGH
            );
            jobsChannel.setDescription("Default notification alerts");
            jobsChannel.enableLights(true);
            jobsChannel.enableVibration(true);
            jobsChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(jobsChannel);

            // 2. Define custom sound channels mapping to res/raw/ files
            String[] sounds = {"alerta_breaking_bad", "complete", "lg_woodpecker", "milomilo", "money"};
            String[] channelNames = {"Alerta Breaking Bad", "Complete Chime", "Woodpecker Alert", "Milo Milo Ring", "Cash Register Money"};

            for (int i = 0; i < sounds.length; i++) {
                String soundName = sounds[i];
                String channelName = channelNames[i];
                
                NotificationChannel channel = new NotificationChannel(
                    soundName + "_v3",
                    channelName,
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Custom sound alerts for " + channelName);
                channel.enableLights(true);
                channel.enableVibration(true);
                channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

                Uri soundUri = null;
                int resourceId = getResources().getIdentifier(soundName, "raw", getPackageName());
                if (resourceId != 0) {
                    soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/" + resourceId);
                } else {
                    soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/" + soundName);
                }

                if (soundUri != null) {
                    AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .build();
                    channel.setSound(soundUri, audioAttributes);
                }

                manager.createNotificationChannel(channel);
            }
        }
    }

    private void handleBase64Download(String url, String contentDisposition, String mimetype) throws Exception {
        int commaIndex = url.indexOf(",");
        if (commaIndex == -1) {
            throw new Exception("Invalid data URI");
        }
        
        String data = url.substring(commaIndex + 1);
        byte[] bytes = Base64.decode(data, Base64.DEFAULT);
        
        String fileName = URLUtil.guessFileName(url, contentDisposition, mimetype);
        File path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        
        if (!path.exists()) {
            path.mkdirs();
        }
        
        File file = new File(path, fileName);
        OutputStream os = new FileOutputStream(file);
        os.write(bytes);
        os.close();
        
        MediaScannerConnection.scanFile(getApplicationContext(), new String[]{file.getAbsolutePath()}, new String[]{mimetype}, null);
        Toast.makeText(getApplicationContext(), "Saved to Downloads: " + fileName, Toast.LENGTH_LONG).show();
    }

    private void handleHttpDownload(String url, String userAgent, String contentDisposition, String mimetype) {
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setMimeType(mimetype);
        
        String fileName = URLUtil.guessFileName(url, contentDisposition, mimetype);
        request.setDescription("Downloading file...");
        request.setTitle(fileName);
        request.allowScanningByMediaScanner();
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
        
        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        if (dm != null) {
            dm.enqueue(request);
            Toast.makeText(getApplicationContext(), "Downloading " + fileName, Toast.LENGTH_SHORT).show();
        }
    }
}
