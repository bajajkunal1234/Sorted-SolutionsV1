package in.sortedsolutions.technician;

import android.os.Bundle;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.View;
import androidx.core.view.ViewCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Prevent screenshots / video recordings of the app
        getWindow().setFlags(
            android.view.WindowManager.LayoutParams.FLAG_SECURE,
            android.view.WindowManager.LayoutParams.FLAG_SECURE
        );

        registerPlugin(GPSBridgePlugin.class);
        super.onCreate(savedInstanceState);
        // Set the window background to solid black programmatically to prevent any splash screen image leak
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.BLACK));

        // Workaround: Override the default WindowInsetsListener to prevent 
        // the default Capacitor logic from stacking padding on the WebView.
        getBridge().getWebView().post(() -> {
            View parent = (View) getBridge().getWebView().getParent();
            ViewCompat.setOnApplyWindowInsetsListener(parent, (v, insets) -> {
                v.setPadding(0, 0, 0, 0); // Reset padding to 0 to prevent the WebView from being pushed up/squished
                return insets;
            });
            getBridge().getWebView().requestApplyInsets();
        });
    }
}
