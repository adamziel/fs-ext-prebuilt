#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const NAN_DIR = path.join(ROOT, 'node_modules', 'nan');
const EXTERNAL_CONDITION = `(V8_MAJOR_VERSION > 14) || \\
    (V8_MAJOR_VERSION == 14 && V8_MINOR_VERSION > 2) || \\
    (V8_MAJOR_VERSION == 14 && V8_MINOR_VERSION == 2 && V8_BUILD_NUMBER >= 194)`;

function patchFile(relativePath, patcher) {
	const filePath = path.join(NAN_DIR, relativePath);
	if (!fs.existsSync(filePath)) {
		throw new Error(`Unable to patch missing NAN file: ${filePath}`);
	}
	const original = fs.readFileSync(filePath, 'utf8');
	const patched = patcher(original);

	if (patched === original) {
		return false;
	}

	fs.writeFileSync(filePath, patched);
	return true;
}

function patchImplementation(source) {
	if (!source.includes('NanV8ExternalNew')) {
		source = source.replace(
			'namespace imp {\n',
			`namespace imp {\n\ninline v8::Local<v8::External> NanV8ExternalNew(\n    v8::Isolate* isolate,\n    void* value) {\n#if ${EXTERNAL_CONDITION}\n  return v8::External::New(isolate, value, v8::kExternalPointerTypeTagDefault);\n#else\n  return v8::External::New(isolate, value);\n#endif\n}\n`
		);
	}

	return source
		.replace(
			/v8::External::New\(v8::Isolate::GetCurrent\(\), value\)/g,
			'NanV8ExternalNew(v8::Isolate::GetCurrent(), value)'
		)
		.replace(
			/v8::External::New\(isolate, reinterpret_cast<void \*>\(callback\)\)/g,
			'NanV8ExternalNew(isolate, reinterpret_cast<void *>(callback))'
		);
}

function patchCallbacks(source) {
	if (!source.includes('NAN_EXTERNAL_VALUE_METHOD')) {
		source = source.replace(
			'#endif\n\ntemplate<typename T>',
			`#endif\n\n#if ${EXTERNAL_CONDITION}\n# define NAN_EXTERNAL_VALUE_METHOD Value(v8::kExternalPointerTypeTagDefault)\n#else\n# define NAN_EXTERNAL_VALUE_METHOD Value()\n#endif\n\ntemplate<typename T>`
		);
	}

	return source.replace(/->Value\(\)/g, '->NAN_EXTERNAL_VALUE_METHOD');
}

if (!fs.existsSync(NAN_DIR)) {
	console.log('NAN is not installed; skipping V8 compatibility patch.');
	process.exit(0);
}

const changed = [
	patchFile('nan_implementation_12_inl.h', patchImplementation),
	patchFile('nan_callbacks_12_inl.h', patchCallbacks),
];

if (changed.some(Boolean)) {
	console.log('Patched NAN for V8 external pointer APIs.');
} else {
	console.log('NAN V8 compatibility patch already applied.');
}
