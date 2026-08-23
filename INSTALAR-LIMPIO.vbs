' ==========================================================
' Nexus One POS v2.9.78 - Instalador con Progreso Visible
'
' Ejecutar como Administrador.
' Ventana de progreso se mantiene abierta durante toda la instalacion.
' ==========================================================

Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strDir
logFile = strDir & "\install-log.txt"
statusFile = WshShell.ExpandEnvironmentStrings("%TEMP%") & "\mepos_status.txt"
htaSrc = strDir & "\PROGRESS.hta"
htaPath = WshShell.ExpandEnvironmentStrings("%TEMP%") & "\mepos_progress.hta"

Sub LogWrite(msg)
    On Error Resume Next
    Set f = objFSO.OpenTextFile(logFile, 8, True)
    f.WriteLine Now() & " | " & msg
    f.Close
    On Error GoTo 0
End Sub

Sub WriteStatus(stepN, totalN, msg, detail, pct, doneFlag, errMsg)
    On Error Resume Next
    Set f = objFSO.CreateTextFile(statusFile, True)
    f.Write stepN & "|" & totalN & "|" & msg & "|" & detail & "|" & pct & "|" & doneFlag & "|" & errMsg
    f.Close
    On Error GoTo 0
End Sub

Function RunHidden(cmd)
    WshShell.CurrentDirectory = strDir
    tmpOut = strDir & "\__cmd_out.tmp"
    On Error Resume Next
    objFSO.DeleteFile tmpOut
    On Error GoTo 0
    cmdFull = "cmd /c " & cmd & " > " & Chr(34) & tmpOut & Chr(34) & " 2>&1"
    ret = WshShell.Run(cmdFull, 0, True)
    RunHidden = ret
    On Error Resume Next
    If objFSO.FileExists(tmpOut) Then
        Set f = objFSO.OpenTextFile(tmpOut, 1)
        If Not f.AtEndOfStream Then output = f.ReadAll Else output = ""
        f.Close
        If ret <> 0 And Len(output) > 0 Then
            Set dbg = objFSO.CreateTextFile(strDir & "\npm-debug-output.txt", True)
            dbg.Write output
            dbg.Close
        End If
        objFSO.DeleteFile tmpOut
        If Len(output) > 2000 Then output = "..." & Right(output, 2000)
        If Len(output) > 0 Then LogWrite "  >> " & Replace(output, vbCrLf, " | ")
    End If
    On Error GoTo 0
End Function

On Error Resume Next
objFSO.DeleteFile statusFile
If objFSO.FileExists(htaSrc) Then
    objFSO.CopyFile htaSrc, htaPath, True
    WshShell.Run htaPath, 1, False
End If
On Error GoTo 0

Dim bienvenida
bienvenida = "Nexus One POS v2.9.78" & vbCrLf & vbCrLf & _
  "Sistema Punto de Venta - Venezuela" & vbCrLf & _
  "Doble Moneda USD/Bs con tasa BCV" & vbCrLf & _
  "Impresion Termica ESC/POS (agente v3.1 winspool)" & vbCrLf & _
  "Dominio local https://nexusone.ve" & vbCrLf & _
  "Acceso movil HTTPS :8443 (camara telefono)" & vbCrLf & vbCrLf & _
  "REQUISITOS:" & vbCrLf & _
  "  - Node.js 18+ instalado" & vbCrLf & _
  "  - Conexion a internet (solo para instalar deps)" & vbCrLf & _
  "  - Ejecutar como Administrador" & vbCrLf & vbCrLf & _
  "NOTA: Instalacion LIMPIA (se borran datos anteriores)." & vbCrLf & vbCrLf & _
  "Desea continuar?"

resultado = MsgBox(bienvenida, vbYesNo + vbQuestion, "Nexus One POS - Instalacion")
If resultado <> vbYes Then WScript.Quit

On Error Resume Next
objFSO.DeleteFile logFile
On Error GoTo 0
LogWrite "=== INSTALACION LIMPIA v2.9.78 ==="
LogWrite "Carpeta: " & strDir

' PASO 1: Permisos
WriteStatus 1, 8, "Verificando permisos...", "", 0, "", ""
LogWrite "PASO 1: Verificando permisos..."
On Error Resume Next
WshShell.Run "cmd /c net session >nul 2>&1", 0, True
isAdmin = (Err.Number = 0)
On Error GoTo 0
If isAdmin Then
    LogWrite "  OK: Administrador"
    WriteStatus 1, 8, "Permisos verificados", "Administrador: SI", 12, "", ""
Else
    LogWrite "  AVISO: No es administrador"
    WriteStatus 1, 8, "Permisos verificados", "Administrador: NO (se saltara hosts/SSL)", 12, "", ""
End If

' PASO 2: Cerrar procesos
WriteStatus 2, 8, "Cerrando procesos anteriores...", "", 12, "", ""
LogWrite "PASO 2: Cerrando procesos..."
WshShell.Run "cmd /c taskkill /F /IM node.exe >nul 2>&1", 0, True
WshShell.Run "cmd /c taskkill /F /IM caddy.exe >nul 2>&1", 0, True
WScript.Sleep 2000
WriteStatus 2, 8, "Procesos cerrados", "", 25, "", ""

' PASO 3: Limpieza
WriteStatus 3, 8, "Limpiando instalacion anterior...", "", 25, "", ""
LogWrite "PASO 3: Limpiando..."
Call RunHidden("if exist node_modules rmdir /s /q node_modules")
Call RunHidden("if exist .next rmdir /s /q .next")
Call RunHidden("if exist .prisma rmdir /s /q .prisma")
On Error Resume Next
objFSO.DeleteFile strDir & "\package-lock.json"
objFSO.DeleteFile strDir & "\prisma\dev.db"
objFSO.DeleteFile strDir & "\prisma\dev.db-journal"
objFSO.DeleteFile strDir & "\prisma\dev.db-wal"
objFSO.DeleteFile strDir & "\prisma\dev.db-shm"
Call RunHidden("if exist printer-agent\spool rmdir /s /q printer-agent\spool")
Call RunHidden("if exist caddy\mobile-data rmdir /s /q caddy\mobile-data")
Call RunHidden("if exist caddy\caddy.exe del caddy\caddy.exe")
On Error GoTo 0
WshShell.RegDelete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run\NexusOnePOS"
objFSO.DeleteFile WshShell.SpecialFolders("Desktop") & "\Nexus One POS.lnk"
If Not objFSO.FolderExists(strDir & "\respaldos") Then objFSO.CreateFolder strDir & "\respaldos"
WriteStatus 3, 8, "Limpieza completada", "", 37, "", ""

' PASO 4: Verificar Node.js
WriteStatus 4, 8, "Verificando Node.js...", "", 37, "", ""
LogWrite "PASO 4: Verificando Node.js..."
On Error Resume Next
Set objExec = WshShell.Exec("cmd /c node -v 2>nul")
Do While objExec.Status = 0: WScript.Sleep 100: Loop
nodeVer = ""
If Not objExec.StdOut.AtEndOfStream Then nodeVer = objExec.StdOut.ReadAll
On Error GoTo 0
If nodeVer = "" Then
    WriteStatus 0, 8, "ERROR", "Node.js no instalado", 0, "FAIL", "Falta Node.js. Descargue de https://nodejs.org"
    MsgBox "Node.js no esta instalado." & vbCrLf & "Descargue de https://nodejs.org e instale.", vbCritical, "ERROR"
    WScript.Quit
End If
nodeMajor = 0
nv = Trim(nodeVer): If Left(nv, 1) = "v" Then nv = Mid(nv, 2)
dp = InStr(nv, "."): If dp > 0 Then nodeMajor = CInt(Left(nv, dp - 1))
If nodeMajor < 18 Then
    WriteStatus 0, 8, "ERROR", "Node.js " & Trim(nodeVer) & " muy antiguo", 0, "FAIL", "Se requiere Node.js 18+. Actualice desde nodejs.org."
    MsgBox "Node.js " & Trim(nodeVer) & " es demasiado antiguo. Se requiere v18+." & vbCrLf & "Descargue de https://nodejs.org", vbCritical, "ERROR"
    WScript.Quit
End If
WriteStatus 4, 8, "Node.js encontrado", Trim(nodeVer), 50, "", ""

' PASO 5: Instalar dependencias
WriteStatus 5, 8, "Instalando dependencias...", "Este paso tarda 1-3 minutos", 50, "", ""
LogWrite "PASO 5: npm install..."
ret = RunHidden("npm install --legacy-peer-deps --ignore-scripts")
If ret <> 0 Then
    LogWrite "  Reintentando..."
    Call RunHidden("npm cache clean --force")
    Call RunHidden("if exist node_modules rmdir /s /q node_modules")
    On Error Resume Next: objFSO.DeleteFile strDir & "\package-lock.json": On Error GoTo 0
    WScript.Sleep 2000
    ret = RunHidden("npm install --legacy-peer-deps")
End If
If ret <> 0 Then
    Call RunHidden("if exist node_modules rmdir /s /q node_modules")
    WScript.Sleep 2000
    ret = RunHidden("npm install --force")
End If
If ret <> 0 Then
    WriteStatus 0, 8, "ERROR", "npm install fallo", 0, "FAIL", "npm install fallo. Revise install-log.txt"
    MsgBox "npm install fallo." & vbCrLf & "Revise install-log.txt en la carpeta del sistema.", vbCritical, "Error"
    WScript.Quit
End If
WriteStatus 5, 8, "Dependencias instaladas", "", 62, "", ""

' PASO 6: Prisma + BD
WriteStatus 6, 8, "Configurando base de datos...", "Prisma generate + db push", 62, "", ""
LogWrite "PASO 6: Prisma..."
ret = RunHidden("npx prisma generate")
If ret <> 0 Then ret = RunHidden("npx prisma generate")
If ret <> 0 Then
    WriteStatus 0, 8, "ERROR", "prisma generate fallo", 0, "FAIL", "prisma generate fallo."
    WScript.Quit
End If
ret = RunHidden("npx prisma db push --skip-generate")
If ret <> 0 Then ret = RunHidden("npx prisma db push --skip-generate")
If ret <> 0 Then
    WriteStatus 0, 8, "ERROR", "prisma db push fallo", 0, "FAIL", "prisma db push fallo."
    WScript.Quit
End If
WriteStatus 6, 8, "Base de datos lista", "", 75, "", ""

' PASO 7: Caddy + HTTPS
WriteStatus 7, 8, "Configurando Caddy HTTPS...", "Descargando Caddy si es necesario", 75, "", ""
LogWrite "PASO 7: Caddy + dominio + movil..."

If isAdmin Then
    hostsFile = WshShell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\drivers\etc\hosts"
    If objFSO.FileExists(hostsFile) Then
        Set f = objFSO.OpenTextFile(hostsFile, 1): hostsContent = f.ReadAll: f.Close
        If InStr(hostsContent, "nexusone.ve") = 0 Then
            Set f = objFSO.OpenTextFile(hostsFile, 8): f.WriteLine vbCrLf & "127.0.0.1    nexusone.ve": f.Close
        End If
    End If
End If

If Not objFSO.FileExists(strDir & "\caddy\caddy.exe") Then
    LogWrite "  Descargando Caddy..."
    WriteStatus 7, 8, "Descargando Caddy...", "", 80, "", ""
    If Not objFSO.FolderExists(strDir & "\caddy") Then objFSO.CreateFolder strDir & "\caddy"
    caddyUrl = "https://caddyserver.com/api/download?os=windows&arch=amd64"
    caddyDest = strDir & "\caddy\caddy.exe"
    psCmd = "powershell -NoProfile -Command " & Chr(34) & "Invoke-WebRequest -Uri '" & caddyUrl & "' -OutFile '" & caddyDest & "' -UseBasicParsing" & Chr(34)
    WshShell.Run "cmd /c " & psCmd, 0, True
End If

' Caddyfile-mobile si no existe
If objFSO.FileExists(strDir & "\caddy\caddy.exe") Then
    If Not objFSO.FileExists(strDir & "\caddy\Caddyfile-mobile") Then
        Set cf = objFSO.CreateTextFile(strDir & "\caddy\Caddyfile-mobile", True)
        cf.WriteLine "{": cf.WriteLine "    admin off": cf.WriteLine "}": cf.WriteLine "": cf.WriteLine ":8443 {"
        cf.WriteLine "    tls internal": cf.WriteLine "    reverse_proxy localhost:3000"
        cf.WriteLine "    header {": cf.WriteLine "        Cross-Origin-Embedder-Policy ""credentialless"""
        cf.WriteLine "        Cross-Origin-Opener-Policy ""same-origin"""
        cf.WriteLine "        X-Content-Type-Options ""nosniff""": cf.WriteLine "    }": cf.WriteLine "}"
        cf.Close
    End If
End If

If isAdmin And objFSO.FileExists(strDir & "\caddy\caddy.exe") Then
    LogWrite "  caddy trust..."
    WriteStatus 7, 8, "Instalando certificado SSL...", "caddy trust", 85, "", ""
    WshShell.CurrentDirectory = strDir & "\caddy"
    WshShell.Run "cmd /c caddy.exe trust", 0, True
    WshShell.CurrentDirectory = strDir
    WshShell.Run "cmd /c netsh advfirewall firewall delete rule name=""Nexus One POS Mobile 8443"" >nul 2>&1", 0, True
    WshShell.Run "cmd /c netsh advfirewall firewall add rule name=""Nexus One POS Mobile 8443"" dir=in action=allow protocol=TCP localport=8443 profile=private,public", 0, True
End If
WriteStatus 7, 8, "Caddy configurado", "HTTPS dominio + movil", 87, "", ""

' PASO 8: Compilar + acceso directo
WriteStatus 8, 8, "Compilando para produccion...", "next build (1-2 min)", 87, "", ""
LogWrite "PASO 8: next build..."
If objFSO.FileExists(strDir & "\node_modules\.bin\next.cmd") Then
    ret = RunHidden("node_modules\.bin\next build")
Else
    ret = RunHidden("npx --no-install next build")
End If
If ret <> 0 Then
    WriteStatus 0, 8, "ERROR", "next build fallo", 0, "FAIL", "Compilacion fallo. Revise install-log.txt."
    MsgBox "La compilacion fallo." & vbCrLf & "Revise install-log.txt", vbCritical, "Error"
    WScript.Quit
End If
Call RunHidden("xcopy /E /I /Q /Y .next\static .next\standalone\.next\static")
Call RunHidden("xcopy /E /I /Q /Y public .next\standalone\public")

' Crear acceso directo al VBS OCULTO (no al .bat)
On Error Resume Next
strDesktop = WshShell.SpecialFolders("Desktop")
Set oLink = WshShell.CreateShortcut(strDesktop & "\Nexus One POS.lnk")
oLink.TargetPath = strDir & "\INICIAR-TODO-OCULTO.vbs"
oLink.WorkingDirectory = strDir
oLink.Description = "Nexus One POS v2.9.78"
oLink.IconLocation = "shell32.dll,14"
oLink.Save
On Error GoTo 0

LogWrite "=== INSTALACION COMPLETADA ==="
WriteStatus 8, 8, "INSTALACION COMPLETADA", "Abra Nexus One POS desde el escritorio", 100, "OK", ""

Dim finale
finale = "INSTALACION COMPLETADA" & vbCrLf & vbCrLf & _
  "Para iniciar el sistema:" & vbCrLf & _
  "  Doble clic en: Nexus One POS (del escritorio)" & vbCrLf & _
  "  O ejecute: INICIAR-TODO-OCULTO.vbs" & vbCrLf & vbCrLf & _
  "El sistema iniciara SIN ventanas CMD." & vbCrLf & vbCrLf & _
  "URLs de acceso:" & vbCrLf & _
  "  https://nexusone.ve     (PC - dominio local)" & vbCrLf & _
  "  https://IP_LOCAL:8443     (telefono - camara barcode)" & vbCrLf & _
  "  http://localhost:3000     (alternativa sin HTTPS)" & vbCrLf & vbCrLf & _
  "USUARIO: admin   CLAVE: admin" & vbCrLf & vbCrLf & _
  "Archivos importantes:" & vbCrLf & _
  "  INSTALAR-LIMPIO.vbs        - Reinstalar desde cero" & vbCrLf & _
  "  INICIAR-TODO-OCULTO.vbs   - Iniciar sin ventanas" & vbCrLf & _
  "  INICIAR-TODO.bat           - Iniciar con ventanas (debug)" & vbCrLf & _
  "  DETENER-TODO.bat           - Detener servicios"

MsgBox finale, vbInformation + vbOKOnly, "Nexus One POS v2.9.78 - Listo"
