package com.example.absensiprototype

import androidx.compose.ui.window.ComposeUIViewController
import com.example.absensiprototype.di.initKoin
import com.example.absensiprototype.platform.PlatformContextHolder
import org.koin.compose.KoinContext

private var koinStarted = false

fun MainViewController() = ComposeUIViewController {
    if (!koinStarted) {
        PlatformContextHolder.setup(null)
        initKoin()
        koinStarted = true
    }
    KoinContext {
        App()
    }
}
