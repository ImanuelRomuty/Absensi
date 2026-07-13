package com.example.absensiprototype.di

import com.example.absensiprototype.data.api.MasarifApi
import com.example.absensiprototype.data.attendance.AttendanceRepository
import com.example.absensiprototype.data.session.SettingsTokenStore
import com.example.absensiprototype.data.session.TokenStore
import com.example.absensiprototype.platform.LocationProvider
import com.example.absensiprototype.ui.attendance.AttendanceViewModel
import com.example.absensiprototype.ui.auth.LoginViewModel
import com.example.absensiprototype.ui.history.HistoryViewModel
import com.example.absensiprototype.ui.profile.ProfileViewModel
import org.koin.core.context.startKoin
import org.koin.core.module.dsl.factoryOf
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val appModule = module {
    single<TokenStore> { SettingsTokenStore() }
    singleOf(::MasarifApi)
    singleOf(::LocationProvider)
    singleOf(::AttendanceRepository)

    factoryOf(::LoginViewModel)
    factoryOf(::AttendanceViewModel)
    factoryOf(::HistoryViewModel)
    factoryOf(::ProfileViewModel)
}

fun initKoin() {
    startKoin {
        modules(appModule)
    }
}
