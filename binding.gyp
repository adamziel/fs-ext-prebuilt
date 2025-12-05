{
    "targets": [
        {
            "target_name": "fs_ext", 
            "include_dirs" : [ "<!(node -e \"require('nan')\")" ],
            "sources": [
                "fs-ext.cc"
            ],
            "cflags_cc": [
                "-std=c++20"
            ],
            "conditions": [
                [ 'OS=="win"', {
                    "msvs_settings": {
                        "VCCLCompilerTool": {
                            "AdditionalOptions": [ "/std:c++20" ]
                        }
                    }
                }],
                [ 'OS=="mac"', {
                    "xcode_settings": {
                        "CLANG_CXX_LANGUAGE_STANDARD": "c++20",
                        "CLANG_CXX_LIBRARY": "libc++",
                        "OTHER_CPLUSPLUSFLAGS": [
                            "-std=c++20"
                        ]
                    }
                }]
            ]
        }
    ]
}
