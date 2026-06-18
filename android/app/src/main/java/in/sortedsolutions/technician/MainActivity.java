package in.sortedsolutions.technician;

import android.os.Bundle;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Set the window background to solid black programmatically to prevent any splash screen image leak
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.BLACK));
    }
}
