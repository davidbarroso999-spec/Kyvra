package com.kyvra.app

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.firebase.crashlytics.FirebaseCrashlytics

@CapacitorPlugin(name = "KyvraCrashlytics")
class KyvraCrashlyticsPlugin : Plugin() {

    @PluginMethod
    fun log(call: PluginCall) {
        val message = call.getString("message")
        if (message.isNullOrEmpty()) {
            call.reject("message is required")
            return
        }

        try {
            FirebaseCrashlytics.getInstance().log(message)
            val ret = JSObject()
            ret.put("status", "logged")
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to log to Crashlytics: ${e.message}")
        }
    }

    @PluginMethod
    fun recordException(call: PluginCall) {
        val message = call.getString("message") ?: "Non-fatal JS Exception"
        val stack = call.getString("stack") ?: ""

        try {
            val exception = Exception("$message\nStack:\n$stack")
            FirebaseCrashlytics.getInstance().recordException(exception)
            
            val ret = JSObject()
            ret.put("status", "recorded")
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to record exception: ${e.message}")
        }
    }

    @PluginMethod
    fun setCustomKey(call: PluginCall) {
        val key = call.getString("key")
        val value = call.getString("value")

        if (key.isNullOrEmpty() || value == null) {
            call.reject("key and value are required")
            return
        }

        try {
            FirebaseCrashlytics.getInstance().setCustomKey(key, value)
            val ret = JSObject()
            ret.put("status", "keySet")
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to set custom key: ${e.message}")
        }
    }

    @PluginMethod
    fun setUserId(call: PluginCall) {
        val userId = call.getString("userId")
        if (userId == null) {
            call.reject("userId is required")
            return
        }

        try {
            FirebaseCrashlytics.getInstance().setUserId(userId)
            val ret = JSObject()
            ret.put("status", "userIdSet")
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to set userId: ${e.message}")
        }
    }

    @PluginMethod
    fun crash(call: PluginCall) {
        // Método de teste de crash para validação do relatório em tempo real
        call.resolve(JSObject().put("status", "crashing"))
        activity.runOnUiThread {
            throw RuntimeException("Teste de falha intencional do Kyvra Crashlytics")
        }
    }
}
