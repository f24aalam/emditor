!macro EMDITOR_BROADCAST_ENVIRONMENT
  System::Call 'USER32::SendMessageTimeoutW(p 0xffff, i 0x001A, p 0, w "Environment", i 0x0002, i 5000, *p .r0)'
!macroend

Function EmditorAddToUserPath
  ReadRegStr $0 HKCU "Environment" "Path"
  StrCmp $0 "" add_first_path_entry
  StrLen $1 $0
  StrCpy $2 0
  StrCpy $3 ""

  add_path_scan:
    IntCmp $2 $1 add_path_last_segment
    StrCpy $4 $0 1 $2
    IntOp $2 $2 + 1
    StrCmp $4 ";" add_path_segment
    StrCpy $3 "$3$4"
    Goto add_path_scan

  add_path_segment:
    StrCmp $3 "$INSTDIR" add_path_done
    StrCpy $3 ""
    Goto add_path_scan

  add_path_last_segment:
    StrCmp $3 "$INSTDIR" add_path_done
    StrCpy $4 $0 1 -1
    StrCmp $4 ";" 0 add_path_separator
    WriteRegExpandStr HKCU "Environment" "Path" "$0$INSTDIR"
    Goto add_path_done

  add_path_separator:
    WriteRegExpandStr HKCU "Environment" "Path" "$0;$INSTDIR"
    Goto add_path_done

  add_first_path_entry:
    WriteRegExpandStr HKCU "Environment" "Path" "$INSTDIR"

  add_path_done:
FunctionEnd

Function EmditorRemoveFromUserPath
  ReadRegStr $0 HKCU "Environment" "Path"
  StrLen $1 $0
  StrCpy $2 0
  StrCpy $3 ""
  StrCpy $5 ""

  remove_path_scan:
    IntCmp $2 $1 remove_path_last_segment
    StrCpy $4 $0 1 $2
    IntOp $2 $2 + 1
    StrCmp $4 ";" remove_path_segment
    StrCpy $3 "$3$4"
    Goto remove_path_scan

  remove_path_segment:
    StrCmp $3 "$INSTDIR" remove_path_next
    StrCmp $3 "" remove_path_next
    StrCmp $5 "" 0 remove_path_append
    StrCpy $5 "$3"
    Goto remove_path_next
  remove_path_append:
    StrCpy $5 "$5;$3"
  remove_path_next:
    StrCpy $3 ""
    Goto remove_path_scan

  remove_path_last_segment:
    StrCmp $3 "$INSTDIR" remove_path_write
    StrCmp $3 "" remove_path_write
    StrCmp $5 "" 0 remove_path_append_last
    StrCpy $5 "$3"
    Goto remove_path_write
  remove_path_append_last:
    StrCpy $5 "$5;$3"

  remove_path_write:
    StrCmp $5 "" 0 remove_path_store
    DeleteRegValue HKCU "Environment" "Path"
    Goto remove_path_done
  remove_path_store:
    WriteRegExpandStr HKCU "Environment" "Path" "$5"
  remove_path_done:
FunctionEnd

!macro NSIS_HOOK_POSTINSTALL
  CopyFiles /SILENT "$INSTDIR\resources\emditor.exe" "$INSTDIR\emditor.exe"
  CopyFiles /SILENT "$INSTDIR\resources\emd.exe" "$INSTDIR\emd.exe"
  Call EmditorAddToUserPath
  !insertmacro EMDITOR_BROADCAST_ENVIRONMENT
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  Call EmditorRemoveFromUserPath
  Delete "$INSTDIR\emditor.exe"
  Delete "$INSTDIR\emd.exe"
  !insertmacro EMDITOR_BROADCAST_ENVIRONMENT
!macroend
