# Raju-ai- Agent Proguard Rules
# Protect native libraries and core React Native functionality

# Keep all native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Protect React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Protect llama.rn native library
-keep class com.llama.** { *; }
-keep interface com.llama.** { *; }
-keepclassmembers class com.llama.** {
    native <methods>;
}

# Protect sqlite-vec
-keep class com.sqlite.** { *; }
-keep interface com.sqlite.** { *; }
-keepclassmembers class com.sqlite.** {
    native <methods>;
}

# Protect Expo modules
-keep class expo.** { *; }
-keep class org.unimodules.** { *; }

# Keep BuildConfig and R classes
-keep class **.BuildConfig { *; }
-keep class **.R$* { *; }

# Protect app package
-keep class space.manus.raju.** { *; }

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Protect AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Protect secure-store
-keep class com.reactnativecommunity.securestore.** { *; }
-keep class com.facebook.crypto.** { *; }

# Keep line numbers for crash reporting
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Optimization settings
-optimizationpasses 5
-dontusemixedcaseclassnames
-verbose

# Remove logging in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
