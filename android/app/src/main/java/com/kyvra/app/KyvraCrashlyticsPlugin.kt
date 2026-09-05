package com.kyvra.app

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

@CapacitorPlugin(name = "KyvraCrashlytics")
class KyvraCrashlyticsPlugin : Plugin() {

    companion object {
        private const val TAG = "KyvraDiagnostics"
        private val customKeys = ConcurrentHashMap<String, String>()
        private var currentUserId: String = "anonymous"
    }

    @PluginMethod
    fun log(call: PluginCall) {
        val message = call.getString("message")
        if (message.isNullOrEmpty()) {
            call.reject("message is required")
            return
        }

        Log.i(TAG, "[Breadcrumb] $message")
        persistLogEntry("INFO", message)

        val ret = JSObject()
        ret.put("status", "logged")
        call.resolve(ret)
    }

    @PluginMethod
    fun recordException(call: PluginCall) {
        val message = call.getString("message") ?: "Non-fatal Exception"
        val stack = call.getString("stack") ?: ""

        Log.e(TAG, "[Handled Exception] $message\nStack:\n$stack")
        persistLogEntry("ERROR", "$message | Stack: $stack")

        val ret = JSObject()
        ret.put("status", "recorded")
        call.resolve(ret)
    }

    @PluginMethod
    fun setCustomKey(call: PluginCall) {
        val key = call.getString("key")
        val value = call.getString("value")

        if (key.isNullOrEmpty() || value == null) {
            call.reject("key and value are required")
            return
        }

        customKeys[key] = value
        Log.d(TAG, "[CustomKey] $key = $value")

        val ret = JSObject()
        ret.put("status", "keySet")
        call.resolve(ret)
    }

    @PluginMethod
    fun setUserId(call: PluginCall) {
        val userId = call.getString("userId")
        if (userId == null) {
            call.reject("userId is required")
            return
        }

        currentUserId = userId
        Log.d(TAG, "[User] ID defined: $userId")

        val ret = JSObject()
        ret.put("status", "userIdSet")
        call.resolve(ret)
    }

    @PluginMethod
    fun crash(call: PluginCall) {
        Log.w(TAG, "[Crash Test] Triggering deliberate test crash")
        call.resolve(JSObject().put("status", "crashing"))
        activity.runOnUiThread {
            throw RuntimeException("Teste de falha intencional do Kyvra Diagnostics")
        }
    }

    private fun persistLogEntry(level: String, content: String) {
        try {
            val dir = context.filesDir ?: return
            val file = File(dir, "kyvra_diagnostics.log")
            val timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US).format(Date())
            val entry = "[$timestamp][$level][User:$currentUserId] $content\n"
            file.appendText(entry)
            
            // Mantém tamanho máximo de 2MB para rotação do log
            if (file.length() > 2 * 1024 * 1024) {
                file.writeText("[LOG ROTATED]\n" + entry)
            }
        } catch (_: Exception) {
            // Silencioso em caso de falha de I/O
        }
    }
}
