package com.kyvra.app

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

@CapacitorPlugin(name = "KyvraStorage")
class KyvraStoragePlugin : Plugin() {

    override fun load() {
        super.load()
        ensureAppDirectories()
    }

    private fun ensureAppDirectories() {
        try {
            val externalFiles = context.getExternalFilesDir(null)
            if (externalFiles != null) {
                File(externalFiles, "audio").mkdirs()
                File(externalFiles, "downloads").mkdirs()
                File(externalFiles, "database").mkdirs()
            }

            val externalCache = context.externalCacheDir
            if (externalCache != null) {
                File(externalCache, "kyvra_audio_cache").mkdirs()
            }
        } catch (_e: Exception) {
            // Silencioso se armazenamento externo não estiver disponível
        }
    }

    @PluginMethod
    fun getStorageInfo(call: PluginCall) {
        try {
            ensureAppDirectories()
            val extFiles = context.getExternalFilesDir(null)
            val extCache = context.externalCacheDir
            val intFiles = context.filesDir
            val intCache = context.cacheDir

            val packagePath = extFiles?.parentFile?.absolutePath 
                ?: "/storage/emulated/0/Android/data/com.kyvra.app"

            var cacheSizeBytes = 0L
            if (extCache != null && extCache.exists()) {
                cacheSizeBytes += getFolderSize(extCache)
            }
            if (intCache.exists()) {
                cacheSizeBytes += getFolderSize(intCache)
            }

            val freeSpaceBytes = extFiles?.freeSpace ?: intFiles.freeSpace

            val result = JSObject()
            result.put("packageName", context.packageName)
            result.put("packagePath", packagePath)
            result.put("filesDir", extFiles?.absolutePath ?: intFiles.absolutePath)
            result.put("cacheDir", extCache?.absolutePath ?: intCache.absolutePath)
            result.put("cacheSizeBytes", cacheSizeBytes)
            result.put("cacheSizeMB", String.format("%.2f MB", cacheSizeBytes / (1024.0 * 1024.0)))
            result.put("freeSpaceMB", String.format("%.2f MB", freeSpaceBytes / (1024.0 * 1024.0)))

            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Erro ao obter informações de armazenamento: ${e.message}")
        }
    }

    @PluginMethod
    fun clearCache(call: PluginCall) {
        try {
            val extCache = context.externalCacheDir
            val intCache = context.cacheDir

            var cleared = false
            if (extCache != null && extCache.exists()) {
                deleteDirContent(extCache)
                cleared = true
            }
            if (intCache.exists()) {
                deleteDirContent(intCache)
                cleared = true
            }

            ensureAppDirectories()

            val result = JSObject()
            result.put("status", "cleared")
            result.put("success", cleared)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Erro ao limpar cache do app: ${e.message}")
        }
    }

    private fun getFolderSize(file: File): Long {
        var size = 0L
        if (file.isDirectory) {
            val children = file.listFiles() ?: return 0L
            for (child in children) {
                size += getFolderSize(child)
            }
        } else {
            size = file.length()
        }
        return size
    }

    private fun deleteDirContent(file: File): Boolean {
        if (file.isDirectory) {
            val children = file.listFiles()
            if (children != null) {
                for (child in children) {
                    deleteDirContent(child)
                    child.delete()
                }
            }
        }
        return true
    }
}
