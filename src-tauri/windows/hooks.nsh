; Remove the opt-in "New → Markdown Document" entry written by the app
; (Help → Add "New Markdown" to right-click menu). Updates keep it.
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    DeleteRegKey HKCU "Software\Classes\.md\ShellNew"
  ${EndIf}
!macroend
