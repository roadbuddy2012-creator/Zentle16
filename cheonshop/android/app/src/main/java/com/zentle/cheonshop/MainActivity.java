package com.zentle.cheonshop;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        paintWebViewBackground(getResources().getConfiguration());
        // 새로 시작했으면 이전 촬영 결과를 받을 곳이 없으니 남은 원본은 모두 지운다
        deleteCameraTempFiles(0);
    }

    @Override
    public void onResume() {
        super.onResume();
        // 앱을 오래 켜 둔 경우: 방금 찍은 사진은 웹뷰가 읽는 중일 수 있으니 1시간 지난 것만 지운다
        deleteCameraTempFiles(60L * 60L * 1000L);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        paintWebViewBackground(newConfig);
    }

    // '사진 찍기'는 카메라 앱이 원본을 Pictures/JPEG_*.jpg에 쓰고, 앱은 줄인 사본만 IndexedDB에 둔다
    private void deleteCameraTempFiles(long olderThanMs) {
        File dir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        if (dir == null) return;
        File[] files = dir.listFiles();
        if (files == null) return;
        long now = System.currentTimeMillis();
        for (File f : files) {
            String name = f.getName();
            if (name.startsWith("JPEG_") && name.endsWith(".jpg") && now - f.lastModified() >= olderThanMs) {
                //noinspection ResultOfMethodCallIgnored
                f.delete();
            }
        }
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
