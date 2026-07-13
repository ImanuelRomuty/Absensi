package com.example.absensiprototype

import android.app.Application
import com.example.absensiprototype.di.initKoin
import com.example.absensiprototype.platform.PlatformContextHolder

class AbsensiApp : Application() {
    override fun onCreate() {
        super.onCreate()
        PlatformContextHolder.setup(this)
        initKoin()
    }
}
