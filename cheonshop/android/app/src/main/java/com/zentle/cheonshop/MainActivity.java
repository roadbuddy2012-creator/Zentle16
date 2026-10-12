package com.zentle.cheonshop;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        paintWebViewBackground(getResources().getConfiguration());
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        paintWebViewBackground(newConfig);
    }

    // 다크 모드에서 시작하거나 키보드로 화면 크기가 바뀔 때 흰 화면이 번쩍이지 않게, 웹뷰 바탕을 테마에 맞춘다
    private void paintWebViewBackground(Configuration config) {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        boolean night = (config.uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        webView.setBackgroundColor(night ? Color.BLACK : Color.WHITE);
    }
}
