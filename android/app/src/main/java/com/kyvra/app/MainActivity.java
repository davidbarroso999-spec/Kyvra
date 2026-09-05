package com.kyvra.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(KyvraAudioPlugin.class);
        registerPlugin(KyvraPerformancePlugin.class);
        registerPlugin(KyvraCrashlyticsPlugin.class);
        registerPlugin(KyvraStoragePlugin.class);
        super.onCreate(savedInstanceState);
        
        // Solicita permissão de notificação nativamente para Android 13+
        // Essencial para manter as notificações de reprodução e o controle de mídia na central
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
        
        // Configura o WebView do Capacitor para permitir a reprodução automática e contínua de mídias sem gestos explícitos
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
        
        // Configura tela cheia imersiva nativa
        setImmersiveFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            setImmersiveFullscreen();
        }
    }

    private void setImmersiveFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Window window = getWindow();
            if (window != null) {
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    // Oculta tanto a barra de status quanto a barra de navegação
                    controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                    // Permite que o usuário acesse as barras deslizando a borda da tela (comportamento temporário/sticky)
                    controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
            }
        } else {
            // Fallback para versões mais antigas do Android (anterior ao 11)
            View decorView = getWindow().getDecorView();
            decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }
    }
}
