' ==========================================================
' Nexus One POS v2.9.80 - Instalador Profesional (FUSION)
'
' Fusion de lo mejor de cada version:
'   v2.9.72: Secuencia de instalacion probada y confiable
'   v2.9.75: Caddy HTTPS + firewall + acceso movil
'   v2.9.78: VBS con progreso visual HTA
'   v2.9.80: Correcciones de robustez total
'
' Caracteristicas:
'   - Barra de progreso visual (PROGRESS.hta)
'   - Instalacion completa en 8 pasos
'   - Caddy HTTPS + acceso movil :8443
'   - Impresion termica ESC/POS (agente winspool)
'   - Inicio oculto via acceso directo al escritorio
'   - Tolerancia a errores en registro/archivos
' ==========================================================

Set WshShell = CreateObject("WScript.Shell")
Set objFSO  = CreateObject("Scripting.FileSystemObject")

strDir    = objFSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strDir
logFile   = strDir & "\install-log.txt"
statusFile= WshShell.ExpandEnvironmentStrings("%TEMP%") & "\mepos_status.txt"
htaSrc    = strDir & "\PROGRESS.hta"
htaPath   = WshShell.ExpandEnvironmentStrings("%TEMP%") & "\mepos_progress.hta"

' ---- Utilidades ----
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
    On Error Resume Next: objFSO.DeleteFile tmpOut: On Error GoTo 0
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
            dbg.Write output: dbg.Close
        End If
        objFSO.DeleteFile tmpOut
        If Len(output) > 2000 Then output = "..." & Right(output, 2000)
        If Len(output) > 0 Then LogWrite "  >> " & Replace(output, vbCrLf, " | ")
    End If
    On Error GoTo 0
End Function

' Eliminar clave de registro silenciosamente (no falla si no existe)
Sub SafeRegDelete(keyPath)
    On Error Resume Next
    WshShell.RegDelete keyPath
    Err.Clear
    On Error GoTo 0
End Sub

' Eliminar archivo silenciosamente
Sub SafeDelete(filePath)
    On Error Resume Next
    objFSO.DeleteFile filePath
    Err.Clear
    On Error GoTo 0
End Sub

' Eliminar carpeta silenciosamente
Sub SafeDeleteFolder(folderPath)
    On Error Resume Next
    If objFSO.FolderExists(folderPath) Then objFSO.DeleteFolder folderPath, True
    Err.Clear
    On Error GoTo 0
End Sub

' ---- Iniciar ventana de progreso ----
On Error Resume Next
objFSO.DeleteFile statusFile
If objFSO.FileExists(htaSrc) Then
    objFSO.CopyFile htaSrc, htaPath, True
    WshShell.Run htaPath, 1, False
End If
On Error GoTo 0

' ---- Confirmacion ----
Dim bienvenida
bienvenida = "Nexus One POS v2.9.80" & vbCrLf & vbCrLf & _
  "Sistema Punto de Venta Profesional" & vbCrLf & _
  "Doble Moneda USD/Bs con tasa BCV" & vbCrLf & _
  "Impresion Termica ESC/POS (agente winspool)" & vbCrLf & _
  "Dominio local https://nexusone.ve" & vbCrLf & _
  "Acceso movil HTTPS :8443 (camara telefono)" & vbCrLf & vbCrLf & _
  "REQUISITOS:" & vbCrLf & _
  "  - Node.js 18+ instalado" & vbCrLf & _
  "  - Conexion a internet" & vbCrLf & _
  "  - Ejecutar como Administrador (recomendado)" & vbCrLf & vbCrLf & _
  "NOTA: Instalacion LIMPIA (se borran datos anteriores)." & vbCrLf & vbCrLf & _
  "Desea continuar?"

resultado = MsgBox(bienvenida, vbYesNo + vbQuestion, "Nexus One POS - Instalacion")
If resultado <> vbYes Then
    On Error Resume Next: objFSO.DeleteFile statusFile: On Error GoTo 0
    WScript.Quit
End If

On Error Resume Next: objFSO.DeleteFile logFile: On Error GoTo 0
LogWrite "=== INSTALACION LIMPIA v2.9.80 ==="
LogWrite "Carpeta: " & strDir

' ============================================================
' PASO 1: Permisos de administrador
' ============================================================
WriteStatus 1, 8, "Verificando permisos...", "", 0, "", ""
LogWrite "PASO 1: Permisos..."
On Error Resume Next
WshShell.Run "cmd /c net session >nul 2>&1", 0, True
isAdmin = (Err.Number = 0)
On Error GoTo 0
If isAdmin Then
    LogWrite "  OK: Administrador"
    WriteStatus 1, 8, "Permisos OK", "Administrador: SI", 12, "", ""
Else
    LogWrite "  AVISO: No es admin (Caddy/hosts/firewall se omitiran)"
    WriteStatus 1, 8, "Permisos OK", "Administrador: NO (funciones limitadas)", 12, "", ""
End If

' ============================================================
' PASO 2: Cerrar procesos anteriores
' ============================================================
WriteStatus 2, 8, "Cerrando procesos...", "", 12, "", ""
LogWrite "PASO 2: Cerrando procesos..."
On Error Resume Next
Set objWMI = GetObject("winmgmts:\\.\root\cimv2")
Set colP = objWMI.ExecQuery("SELECT * FROM Win32_Process WHERE Name='node.exe'")
For Each p In colP: p.Terminate(): Next
WScript.Sleep 500
Set colP = objWMI.ExecQuery("SELECT * FROM Win32_Process WHERE Name='caddy.exe'")
For Each p In colP: p.Terminate(): Next
On Error GoTo 0
WScript.Sleep 2000
WriteStatus 2, 8, "Procesos cerrados", "", 25, "", ""

' ============================================================
' PASO 3: Limpieza total (tolerante a errores)
' ============================================================
WriteStatus 3, 8, "Limpiando instalacion anterior...", "", 25, "", ""
LogWrite "PASO 3: Limpiando..."

' Carpetas
Call RunHidden("if exist node_modules rmdir /s /q node_modules")
Call RunHidden("if exist .next rmdir /s /q .next")
Call RunHidden("if exist .prisma rmdir /s /q .prisma")

' Archivos individuales
Call SafeDelete(strDir & "\package-lock.json")
Call SafeDelete(strDir & "\prisma\dev.db")
Call SafeDelete(strDir & "\prisma\dev.db-journal")
Call SafeDelete(strDir & "\prisma\dev.db-wal")
Call SafeDelete(strDir & "\prisma\dev.db-shm")
Call SafeDelete(strDir & "\caddy\caddy.exe")
Call SafeDelete(strDir & "\.caddy-env.bat")
Call SafeDelete(strDir & "\.caddy-domain")

' Carpetas de spool y datos moviles
Call RunHidden("if exist printer-agent\spool rmdir /s /q printer-agent\spool")
Call RunHidden("if exist caddy\mobile-data rmdir /s /q caddy\mobile-data")

' Accesos directos antiguos del escritorio
On Error Resume Next
strDesktop = WshShell.SpecialFolders("Desktop")
SafeDelete(strDesktop & "\MyeCommerce POS.lnk")
SafeDelete(strDesktop & "\MyeCommerce.lnk")
SafeDelete(strDesktop & "\Nexus One POS.lnk")
On Error GoTo 0

' Claves de registro de inicio automatico (tolerante - no falla si no existen)
Call SafeRegDelete("HKCU\Software\Microsoft\Windows\CurrentVersion\Run\MyeCommercePOS")
Call SafeRegDelete("HKCU\Software\Microsoft\Windows\CurrentVersion\Run\MyeCommerceHidden")
Call SafeRegDelete("HKCU\Software\Microsoft\Windows\CurrentVersion\Run\NexusOnePOS")

' Crear carpeta respaldos
On Error Resume Next
If Not objFSO.FolderExists(strDir & "\respaldos") Then objFSO.CreateFolder strDir & "\respaldos"
On Error GoTo 0

WriteStatus 3, 8, "Limpieza completada", "", 37, "", ""

' ============================================================
' PASO 4: Refrescar PATH + verificar Node.js
' ============================================================
WriteStatus 4, 8, "Verificando Node.js...", "", 37, "", ""
LogWrite "PASO 4: Node.js..."

' Refrescar PATH desde registro (por si Node se instalo recien)
On Error Resume Next
Set objReg = GetObject("winmgmts:\\.\root\default:StdRegProv")
objReg.GetStringValue &H80000002, "SYSTEM\CurrentControlSet\Control\Session Manager\Environment", "Path", sysPath
objReg.GetStringValue &H80000001, "Environment", "Path", usrPath
newPath = ""
If sysPath <> "" Then newPath = sysPath & ";"
If usrPath <> "" Then newPath = newPath & usrPath & ";"
If newPath <> "" Then WshShell.Environment("PROCESS").Item("PATH") = newPath & WshShell.Environment("PROCESS").Item("PATH")
On Error GoTo 0

' Verificar Node.js
On Error Resume Next
Set objExec = WshShell.Exec("cmd /c node -v 2>nul")
Do While objExec.Status = 0: WScript.Sleep 100: Loop
nodeVer = ""
If Not objExec.StdOut.AtEndOfStream Then nodeVer = objExec.StdOut.ReadAll
On Error GoTo 0

If nodeVer = "" Then
    WriteStatus 0, 8, "ERROR", "Node.js no instalado", 0, "FAIL", "Falta Node.js 18+. Descargue de https://nodejs.org"
    MsgBox "Node.js no esta instalado." & vbCrLf & "Descargue de https://nodejs.org" & vbCrLf & "(Version 20 LTS recomendada)", vbCritical, "ERROR - Falta Node.js"
    WScript.Quit
End If

' Verificar version mayor o igual a 18
nodeMajor = 0
nv = Trim(nodeVer): If Left(nv, 1) = "v" Then nv = Mid(nv, 2)
dp = InStr(nv, "."): If dp > 0 Then nodeMajor = CInt(Left(nv, dp - 1))
If nodeMajor < 18 Then
    WriteStatus 0, 8, "ERROR", "Node.js muy antiguo", 0, "FAIL", "Se requiere Node.js 18+. Tiene " & Trim(nodeVer)
    MsgBox "Node.js " & Trim(nodeVer) & " es muy antiguo." & vbCrLf & "Se requiere v18+." & vbCrLf & "Descargue de https://nodejs.org", vbCritical, "ERROR - Node.js antiguo"
    WScript.Quit
End If

LogWrite "  OK: Node.js " & Trim(nodeVer)
WriteStatus 4, 8, "Node.js " & Trim(nodeVer), "Version compatible", 50, "", ""

' ============================================================
' PASO 5: Instalar dependencias (con reintentos)
' ============================================================
WriteStatus 5, 8, "Instalando dependencias...", "npm install (1-3 min)", 50, "", ""
LogWrite "PASO 5: npm install..."

' Intento 1: normal
ret = RunHidden("npm install --legacy-peer-deps --ignore-scripts")
If ret <> 0 Then
    ' Intento 2: limpiar cache y reintentar
    LogWrite "  Reintentando (limpiando cache)..."
    Call RunHidden("npm cache clean --force")
    Call RunHidden("if exist node_modules rmdir /s /q node_modules")
    Call SafeDelete(strDir & "\package-lock.json")
    WScript.Sleep 2000
    ret = RunHidden("npm install --legacy-peer-deps")
End If
If ret <> 0 Then
    ' Intento 3: --force
    LogWrite "  Reintentando con --force..."
    Call RunHidden("if exist node_modules rmdir /s /q node_modules")
    WScript.Sleep 2000
    ret = RunHidden("npm install --force")
End If
If ret <> 0 Then
    WriteStatus 0, 8, "ERROR", "npm install fallo", 0, "FAIL", "npm install fallo tras 3 intentos. Revise install-log.txt."
    MsgBox "No se pudieron instalar las dependencias." & vbCrLf & vbCrLf & _
      "Posibles soluciones:" & vbCrLf & _
      "1. Verifique su conexion a internet" & vbCrLf & _
      "2. Actualice Node.js a la version 20 LTS" & vbCrLf & _
      "3. Revise install-log.txt para detalles", vbCritical, "ERROR - Dependencias"
    WScript.Quit
End If
WriteStatus 5, 8, "Dependencias instaladas", "", 62, "", ""

' ============================================================
' PASO 6: Prisma + Base de Datos
' ============================================================
WriteStatus 6, 8, "Configurando base de datos...", "", 62, "", ""
LogWrite "PASO 6: Prisma..."

' Generar cliente Prisma (con reintento)
ret = RunHidden("npx prisma generate")
If ret <> 0 Then
    LogWrite "  Reintentando prisma generate..."
    ret = RunHidden("npx prisma generate")
End If
If ret <> 0 Then
    WriteStatus 0, 8, "ERROR", "prisma generate fallo", 0, "FAIL", "prisma generate fallo. Revise install-log.txt."
    MsgBox "La generacion de Prisma fallo." & vbCrLf & "Revise install-log.txt", vbCritical, "ERROR - Prisma"
    WScript.Quit
End If

' Crear/actualizar base de datos
ret = RunHidden("npx prisma db push --skip-generate")
If ret <> 0 Then
    LogWrite "  Reintentando prisma db push..."
    ret = RunHidden("npx prisma db push --skip-generate")
End If
If ret <> 0 Then
    WriteStatus 0, 8, "ERROR", "prisma db push fallo", 0, "FAIL", "prisma db push fallo. Revise install-log.txt."
    MsgBox "La creacion de la base de datos fallo." & vbCrLf & "Revise install-log.txt", vbCritical, "ERROR - Base de datos"
    WScript.Quit
End If

' Crear .env si no existe
On Error Resume Next
If Not objFSO.FileExists(strDir & "\.env") Then
    If objFSO.FileExists(strDir & "\.env.example") Then
        objFSO.CopyFile strDir & "\.env.example", strDir & "\.env", True
        LogWrite "  .env creado desde .env.example"
    Else
        Set envFile = objFSO.CreateTextFile(strDir & "\.env", True)
        envFile.WriteLine "DATABASE_URL=\"file:./dev.db\""
        envFile.WriteLine "APP_PORT=3000"
        envFile.WriteLine "NODE_ENV=production"
        envFile.Close
        LogWrite "  .env creado con valores predeterminados"
    End If
Else
    LogWrite "  .env ya existe, conservado"
End If
On Error GoTo 0

WriteStatus 6, 8, "Base de datos lista", "Prisma + SQLite OK", 75, "", ""

' ============================================================
' PASO 7: Caddy HTTPS + DNS + Firewall
' ============================================================
WriteStatus 7, 8, "Configurando Caddy HTTPS...", "", 75, "", ""
LogWrite "PASO 7: Caddy..."

caddyReady = False

If isAdmin Then
    ' Configurar archivo hosts para DNS local
    hostsFile = WshShell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\drivers\etc\hosts"
    On Error Resume Next
    If objFSO.FileExists(hostsFile) Then
        Set f = objFSO.OpenTextFile(hostsFile, 1)
        hc = f.ReadAll
        f.Close
        If InStr(hc, "nexusone.ve") = 0 Then
            Set f = objFSO.OpenTextFile(hostsFile, 8)
            f.WriteLine vbCrLf & "127.0.0.1    nexusone.ve"
            f.Close
            LogWrite "  hosts: entrada nexusone.ve agregada"
        Else
            LogWrite "  hosts: entrada ya existe"
        End If
    End If
    On Error GoTo 0

    ' Descargar Caddy si no existe
    If Not objFSO.FileExists(strDir & "\caddy\caddy.exe") Then
        LogWrite "  Descargando Caddy..."
        WriteStatus 7, 8, "Descargando Caddy...", "", 78, "", ""
        If Not objFSO.FolderExists(strDir & "\caddy") Then objFSO.CreateFolder strDir & "\caddy"
        psCmd = "powershell -NoProfile -Command " & Chr(34) & _
          "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " & _
          "try { Invoke-WebRequest -Uri 'https://caddyserver.com/api/download?os=windows&arch=amd64' -OutFile '" & strDir & "\caddy\caddy.exe' -UseBasicParsing; Write-Host 'OK' } catch { Write-Host 'FAIL' }" & Chr(34)
        WshShell.Run "cmd /c " & psCmd, 0, True
        LogWrite "  Caddy descargado"
    Else
        LogWrite "  Caddy ya existe"
    End If

    ' Configurar Caddyfiles si no existen
    If objFSO.FileExists(strDir & "\caddy\caddy.exe") Then
        caddyReady = True

        ' Caddyfile principal (dominio nexusone.ve)
        If Not objFSO.FileExists(strDir & "\caddy\Caddyfile") Then
            Set cf = objFSO.CreateTextFile(strDir & "\caddy\Caddyfile", True)
            cf.WriteLine "# Nexus One POS - Caddy HTTPS Local"
            cf.WriteLine "http://nexusone.ve {" : cf.WriteLine "    redir https://nexusone.ve{uri}" : cf.WriteLine "}"
            cf.WriteLine "nexusone.ve {" : cf.WriteLine "    tls internal" : cf.WriteLine "    reverse_proxy localhost:3000" : cf.WriteLine "}"
            cf.Close
            LogWrite "  Caddyfile creado"
        End If

        ' Caddyfile movil (:8443 para camara telefono)
        If Not objFSO.FileExists(strDir & "\caddy\Caddyfile-mobile") Then
            Set cf = objFSO.CreateTextFile(strDir & "\caddy\Caddyfile-mobile", True)
            cf.WriteLine "{" : cf.WriteLine "    admin off" : cf.WriteLine "}" : cf.WriteLine ""
            cf.WriteLine ":8443 {" : cf.WriteLine "    tls internal" : cf.WriteLine "    reverse_proxy localhost:3000"
            cf.WriteLine "    header {" : cf.WriteLine "        Cross-Origin-Embedder-Policy ""credentialless"""
            cf.WriteLine "        Cross-Origin-Opener-Policy ""same-origin"""
            cf.WriteLine "        X-Content-Type-Options ""nosniff""" : cf.WriteLine "    }" : cf.WriteLine "}"
            cf.Close
            LogWrite "  Caddyfile-mobile creado"
        End If

        ' Confianza del certificado SSL
        LogWrite "  caddy trust..."
        WriteStatus 7, 8, "Instalando certificado SSL...", "", 82, "", ""
        WshShell.CurrentDirectory = strDir & "\caddy"
        WshShell.Run "cmd /c caddy.exe trust", 0, True
        WshShell.CurrentDirectory = strDir

        ' Firewall para puerto 8443
        WshShell.Run "cmd /c netsh advfirewall firewall delete rule name=""Nexus POS Mobile 8443"" >nul 2>&1", 0, True
        WshShell.Run "cmd /c netsh advfirewall firewall add rule name=""Nexus POS Mobile 8443"" dir=in action=allow protocol=TCP localport=8443 profile=private,public", 0, True
        LogWrite "  Firewall configurado"
    End If
Else
    ' No es admin - intentar usar Caddy si ya existe
    If objFSO.FileExists(strDir & "\caddy\caddy.exe") Then
        caddyReady = True
        LogWrite "  Caddy existe pero sin permisos de admin (DNS/firewall omitidos)"
    Else
        LogWrite "  Sin permisos de admin, Caddy omitido"
    End If
End If

WriteStatus 7, 8, "Caddy configurado", IIf(caddyReady, "HTTPS dominio + movil :8443", "HTTP localhost:3000"), 87, "", ""

' ============================================================
' PASO 8: Compilar + crear acceso directo
' ============================================================
WriteStatus 8, 8, "Compilando para produccion...", "next build (1-2 min)", 87, "", ""
LogWrite "PASO 8: next build..."

If objFSO.FileExists(strDir & "\node_modules\.bin\next.cmd") Then
    ret = RunHidden("node_modules\.bin\next build")
Else
    ret = RunHidden("npx --no-install next build")
End If
If ret <> 0 Then
    ' Reintentar con npx
    LogWrite "  Reintentando con npx next build..."
    ret = RunHidden("npx next build")
End If
If ret <> 0 Then
    WriteStatus 0, 8, "ERROR", "Compilacion fallo", 0, "FAIL", "next build fallo. Revise install-log.txt."
    MsgBox "La compilacion fallo." & vbCrLf & vbCrLf & _
      "Posibles soluciones:" & vbCrLf & _
      "1. Ejecute INICIAR-TODO.bat para ver el error detallado" & vbCrLf & _
      "2. Revise install-log.txt" & vbCrLf & _
      "3. Actualice Node.js", vbCritical, "ERROR - Compilacion"
    WScript.Quit
End If

' Copiar static a standalone para arranque rapido
Call RunHidden("xcopy /E /I /Q /Y .next\static .next\standalone\.next\static")
Call RunHidden("xcopy /E /I /Q /Y public .next\standalone\public")

' Crear acceso directo al escritorio -> INICIAR-TODO-OCULTO.vbs (inicio sin consolas)
On Error Resume Next
strDesktop = WshShell.SpecialFolders("Desktop")
Set oLink = WshShell.CreateShortcut(strDesktop & "\Nexus One POS.lnk")
oLink.TargetPath = strDir & "\INICIAR-TODO-OCULTO.vbs"
oLink.WorkingDirectory = strDir
oLink.Description = "Nexus One POS v2.9.80 - Iniciar sistema"
oLink.IconLocation = "shell32.dll,14"
oLink.Save
On Error GoTo 0
LogWrite "  Acceso directo creado -> INICIAR-TODO-OCULTO.vbs"

LogWrite "=== INSTALACION COMPLETADA ==="
WriteStatus 8, 8, "INSTALACION COMPLETADA", "Abra Nexus One POS del escritorio", 100, "OK", ""

' Cerrar ventana de progreso tras 3 segundos
WScript.Sleep 3000
On Error Resume Next: objFSO.DeleteFile statusFile: On Error GoTo 0

' Mensaje final
Dim finale
finale = "INSTALACION COMPLETADA" & vbCrLf & vbCrLf & _
  "Doble clic en: Nexus One POS (escritorio)" & vbCrLf & _
  "El sistema iniciara SIN ventanas de consola." & vbCrLf & vbCrLf & _
  "URLs de acceso:" & vbCrLf & _
  "  https://nexusone.ve        (PC - HTTPS)" & vbCrLf & _
  "  https://IP_LOCAL:8443     (telefono - camara)" & vbCrLf & _
  "  http://localhost:3000     (alternativa HTTP)" & vbCrLf & vbCrLf & _
  "USUARIO: admin   CLAVE: admin" & vbCrLf & vbCrLf & _
  "Para detener: DETENER-TODO.bat"

MsgBox finale, vbInformation, "Nexus One POS v2.9.80"

' ---- Funcion auxiliar ----
Function IIf(cond, trueVal, falseVal)
    If cond Then IIf = trueVal Else IIf = falseVal
End Function
