!macro NSIS_HOOK_PREUNINSTALL
  IfSilent keep_data

  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON1 "Deseja remover também todos os dados locais do M&G Pocket?$\r$\n$\r$\nIsso inclui campanhas, personagens, imagens, banco de dados, backups, runtime portátil e logs.$\r$\n$\r$\nSim: Remover tudo$\r$\nNão: Manter meus dados" IDYES remove_all IDNO keep_data

  remove_all:
    ExecWait '"$INSTDIR\mg-pocket-launcher.exe" --uninstall-cleanup --remove-user-data' $0
    Goto cleanup_done

  keep_data:
    ExecWait '"$INSTDIR\mg-pocket-launcher.exe" --uninstall-cleanup' $0
    IfSilent cleanup_done
    MessageBox MB_ICONINFORMATION|MB_OK "Seus dados locais foram preservados em:$\r$\n%LOCALAPPDATA%\MG Pocket"

  cleanup_done:
!macroend
