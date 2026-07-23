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

        // Workaround: Override the default WindowInsetsListener to prevent 
        // the default Capacitor logic from stacking padding on the WebView.
        getBridge().getWebView().post(() -> {
            // Lock text zoom to 100% to ignore system font size changes
            try {
                getBridge().getWebView().getSettings().setTextZoom(100);
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
