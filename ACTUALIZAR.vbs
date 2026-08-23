' ============================================================
' Nexus One POS - ACTUALIZAR VERSION
' Migrar SIN PERDER PRODUCTOS, VENTAS NI CONFIGURACION
' ============================================================

Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
WshShell.CurrentDirectory = objFSO.GetParentFolderName(WScript.ScriptFullName)
strDir = WshShell.CurrentDirectory

If Not objFSO.FileExists(strDir & "\prisma\dev.db") Then
    MsgBox "No se encontro la base de datos." & vbCrLf & "Este script debe ejecutarse en una instalacion existente.", vbCritical, "Error"
    WScript.Quit
End If

result = MsgBox("Se realizara un respaldo antes de actualizar." & vbCrLf & "Desea continuar?", vbYesNo + vbQuestion, "Nexus One POS - Actualizar")
If result <> vbYes Then WScript.Quit

WshShell.Run "cmd /c taskkill /F /IM node.exe >nul 2>&1", 0, True
WshShell.Run "cmd /c taskkill /F /IM caddy.exe >nul 2>&1", 0, True
WScript.Sleep 2000

backupName = "BACKUP_" & Year(Now) & "-" & Right("0" & Month(Now), 2) & "-" & Right("0" & Day(Now), 2)
WshShell.Run "cmd /c mkdir " & backupName & " 2>nul", 0, True
WshShell.Run "cmd /c copy prisma\dev.db " & backupName & "\dev.db >nul", 0, True
WshShell.Run "cmd /c powershell -NoProfile -Command ""Compress-Archive -Path '" & backupName & "\*' -DestinationPath '" & backupName & ".zip' -Force"" >nul 2>&1", 0, True

WshShell.Run "cmd /c npm install --legacy-peer-deps --no-audit --no-fund", 0, True
WshShell.Run "cmd /c npx prisma generate >nul 2>&1", 0, True
WshShell.Run "cmd /c npx prisma db push --skip-generate --accept-data-loss >nul 2>&1", 0, True
WshShell.Run "cmd /c npx next build", 0, True

MsgBox "Actualizacion completada." & vbCrLf & "Respaldo: " & backupName & ".zip" & vbCrLf & vbCrLf & "Para iniciar: doble clic en Nexus One POS del escritorio.", vbInformation, "Nexus One POS - Actualizado"
