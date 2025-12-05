cmd_Release/obj.target/fs_ext/fs-ext.o := c++ -o Release/obj.target/fs_ext/fs-ext.o ../fs-ext.cc '-DNODE_GYP_MODULE_NAME=fs_ext' '-DUSING_UV_SHARED=1' '-DUSING_V8_SHARED=1' '-DV8_DEPRECATION_WARNINGS=1' '-D_GLIBCXX_USE_CXX11_ABI=1' '-D_FILE_OFFSET_BITS=64' '-DELECTRON_ENSURE_CONFIG_GYPI' '-D_DARWIN_USE_64_BIT_INODE=1' '-D_LARGEFILE_SOURCE' '-DUSING_ELECTRON_CONFIG_GYPI' '-DV8_COMPRESS_POINTERS' '-DV8_COMPRESS_POINTERS_IN_SHARED_CAGE' '-DV8_31BIT_SMIS_ON_64BIT_ARCH' '-DV8_ENABLE_SANDBOX' '-DV8_EXTERNAL_CODE_SPACE' '-DOPENSSL_NO_PINSHARED' '-DOPENSSL_THREADS' '-DOPENSSL_NO_ASM' '-DBUILDING_NODE_EXTENSION' -I/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node -I/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/src -I/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/deps/openssl/config -I/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/deps/openssl/openssl/include -I/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/deps/uv/include -I/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/deps/zlib -I/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/deps/v8/include -I../node_modules/nan  -O3 -gdwarf-2 -fno-strict-aliasing -mmacosx-version-min=11.0 -arch x86_64 -Wall -Wendif-labels -W -Wno-unused-parameter -std=gnu++20 -stdlib=libc++ -fno-rtti -fno-exceptions -MMD -MF ./Release/.deps/Release/obj.target/fs_ext/fs-ext.o.d.raw   -c
Release/obj.target/fs_ext/fs-ext.o: ../fs-ext.cc \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/common.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8config.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-array-buffer.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-local-handle.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-handle-base.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-internal.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-memory-span.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-object.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/garbage-collected.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/internal/api-constants.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/platform.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/source-location.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-source-location.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-platform.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/trace-trait.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/type-traits.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/name-provider.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-maybe.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/internal/conditional-stack-allocated.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/macros.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/internal/compiler-specific.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-persistent-handle.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-weak-callback-info.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-primitive.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-data.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-value.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-sandbox.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-traced-handle.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-container.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-context.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-snapshot.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-isolate.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-callbacks.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-promise.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-debug.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-script.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-message.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-embedder-heap.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-exception.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-function-callback.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-microtask.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-statistics.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-unwinder.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-embedder-state-scope.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-date.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-extension.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-external.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-function.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-template.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-initialization.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-json.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-locker.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-microtask-queue.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-primitive-object.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-proxy.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-regexp.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-typed-array.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-value-serializer.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-version.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-wasm.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node_version.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node_api.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/js_native_api.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/js_native_api_types.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node_api_types.h \
  ../node_modules/nan/nan.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv/errno.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv/version.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv/unix.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv/threadpool.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv/darwin.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node_buffer.h \
  /var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node_object_wrap.h \
  ../node_modules/nan/nan_callbacks.h \
  ../node_modules/nan/nan_callbacks_12_inl.h \
  ../node_modules/nan/nan_maybe_43_inl.h \
  ../node_modules/nan/nan_converters.h \
  ../node_modules/nan/nan_converters_43_inl.h \
  ../node_modules/nan/nan_new.h \
  ../node_modules/nan/nan_implementation_12_inl.h \
  ../node_modules/nan/nan_persistent_12_inl.h \
  ../node_modules/nan/nan_weak.h ../node_modules/nan/nan_object_wrap.h \
  ../node_modules/nan/nan_private.h \
  ../node_modules/nan/nan_typedarray_contents.h \
  ../node_modules/nan/nan_json.h ../node_modules/nan/nan_scriptorigin.h
../fs-ext.cc:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/common.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8config.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-array-buffer.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-local-handle.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-handle-base.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-internal.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-memory-span.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-object.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/garbage-collected.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/internal/api-constants.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/platform.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/source-location.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-source-location.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-platform.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/trace-trait.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/type-traits.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/name-provider.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-maybe.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/internal/conditional-stack-allocated.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/macros.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/cppgc/internal/compiler-specific.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-persistent-handle.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-weak-callback-info.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-primitive.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-data.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-value.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-sandbox.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-traced-handle.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-container.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-context.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-snapshot.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-isolate.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-callbacks.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-promise.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-debug.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-script.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-message.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-embedder-heap.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-exception.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-function-callback.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-microtask.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-statistics.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-unwinder.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-embedder-state-scope.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-date.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-extension.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-external.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-function.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-template.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-initialization.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-json.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-locker.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-microtask-queue.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-primitive-object.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-proxy.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-regexp.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-typed-array.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-value-serializer.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-version.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/v8-wasm.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node_version.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node_api.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/js_native_api.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/js_native_api_types.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node_api_types.h:
../node_modules/nan/nan.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv/errno.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv/version.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv/unix.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv/threadpool.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/uv/darwin.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node_buffer.h:
/var/folders/sb/cywb762129g3f0jzq1_p2q5h0000gp/T/prebuildify/electron/38.2.2/include/node/node_object_wrap.h:
../node_modules/nan/nan_callbacks.h:
../node_modules/nan/nan_callbacks_12_inl.h:
../node_modules/nan/nan_maybe_43_inl.h:
../node_modules/nan/nan_converters.h:
../node_modules/nan/nan_converters_43_inl.h:
../node_modules/nan/nan_new.h:
../node_modules/nan/nan_implementation_12_inl.h:
../node_modules/nan/nan_persistent_12_inl.h:
../node_modules/nan/nan_weak.h:
../node_modules/nan/nan_object_wrap.h:
../node_modules/nan/nan_private.h:
../node_modules/nan/nan_typedarray_contents.h:
../node_modules/nan/nan_json.h:
../node_modules/nan/nan_scriptorigin.h:
