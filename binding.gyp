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
                }]
            ]
        }
    ]
}
