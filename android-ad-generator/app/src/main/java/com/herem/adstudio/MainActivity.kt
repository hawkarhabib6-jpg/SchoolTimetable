package com.herem.adstudio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.herem.adstudio.presentation.editor.EditorRoute
import com.herem.adstudio.presentation.theme.AdStudioTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent { AdStudioApp() }
    }
}

@Composable
private fun AdStudioApp() {
    AdStudioTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            // A single-screen editor for now; the nav graph starts here when the gallery,
            // template browser and export screens land.
            EditorRoute()
        }
    }
}
