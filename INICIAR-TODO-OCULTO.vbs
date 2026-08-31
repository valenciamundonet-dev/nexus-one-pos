' ============================================================
' Nexus One POS v2.9.81 - Inicio TOTALMENTE OCULTO
'
' Esto es lo que ejecuta el acceso directo del escritorio.
' TODOS los servicios inician SIN ventanas de consola:
'   1. Printer-Agent (9100) - impresion termica winspool
'   2. Caddy Dominio (443)  - HTTPS nexusone.ve (PC)
'   3. Caddy Movil (8443)   - HTTPS IP local (camara telefono)
'   4. Next.js (3000)       - aplicacion web
'
' Fusion de lo mejor de cada version:
'   v2.9.72: Secuencia de inicio probada
'   v2.9.75: Caddy + printer agent
'   v2.9.78: Refresco PATH + auto-reparacion
'   v2.9.80: Robustez total
'   v2.9.81: Fix JWT_SECRET + verificacion BD antes de iniciar
' ============================================================

Set WshShell = CreateObject("WScript.Shell")
Set objFSO  = CreateObject("Scripting.FileSystemObject")
WshShell.CurrentDirectory = objFSO.GetParentFolderName(WScript.ScriptFullName)
strDir = WshShell.CurrentDirectory

' ---- Refrescar PATH desde registro (por si Node se instalo recien) ----
On Error Resume Next
Set objReg = GetObject("winmgmts:\\.\root\default:StdRegProv")
objReg.GetStringValue &H80000002, "SYSTEM\CurrentControlSet\Control\Session Manager\Environment", "Path", sysPath
objReg.GetStringValue &H80000001, "Environment", "Path", usrPath
newPath = ""
If sysPath <> "" Then newPath = sysPath & ";"
If usrPath <> "" Then newPath = newPath & usrPath & ";"
If newPath <> "" Then
    curPath = WshShell.ExpandEnvironmentStrings("%PATH%")
    WshShell.Environment("PROCESS").Item("PATH") = newPath & curPath
End If
On Error GoTo 0

' ---- PASO 1: Matar procesos anteriores (WMI, silencioso) ----
On Error Resume Next
Set objWMI = GetObject("winmgmts:\\.\root\cimv2")
Set colProcs = objWMI.ExecQuery("SELECT * FROM Win32_Process WHERE Name='node.exe'")
For Each p In colProcs: p.Terminate(): Next
WScript.Sleep 500
Set colProcs = objWMI.ExecQuery("SELECT * FROM Win32_Process WHERE Name='caddy.exe'")
For Each p In colProcs: p.Terminate(): Next
On Error GoTo 0
WScript.Sleep 2000

' ---- PASO 2: Detectar IP local para Caddyfile-mobile ----
WshShell.Run "cmd /c powershell -NoProfile -Command ""$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' } | Select-Object -First 1 -ExpandProperty IPAddress); if (-not $ip) { $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { -not $_.Loopback -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress) }; Write-Output $ip"" > """ & strDir & "\caddy\local-ip.txt"" 2>nul", 0, True

' ---- PASO 3: Verificar/crear BD y Prisma si faltan ----
' Verificar que .env existe (contiene JWT_SECRET y DATABASE_URL)
If Not objFSO.FileExists(strDir & "\.env") Then
    On Error Resume Next
    Set envFile = objFSO.CreateTextFile(strDir & "\.env", True)
    envFile.WriteLine "DATABASE_URL=""file:./dev.db"""
    envFile.WriteLine "NODE_ENV=production"
    envFile.Close
    On Error GoTo 0
End If

' Verificar que la BD existe, sino crearla
If Not objFSO.FileExists(strDir & "\prisma\dev.db") Then
    WshShell.Run "cmd /c npx prisma generate", 0, True
    WshShell.Run "cmd /c npx prisma db push --skip-generate", 0, True
End If

' Verificar que node_modules/.prisma/client existe (prisma generate)
If Not objFSO.FileExists(strDir & "\node_modules\.prisma\client\index.js") Then
    WshShell.Run "cmd /c npx prisma generate", 0, True
End If

' Verificar que la BD realmente existe y tiene tamanno > 0
On Error Resume Next
dbOk = False
If objFSO.FileExists(strDir & "\prisma\dev.db") Then
    If objFSO.GetFile(strDir & "\prisma\dev.db").Size > 0 Then
        dbOk = True
    End If
End If
If Not dbOk Then
    ' Ultimo intento: regenerar todo
    WshShell.Run "cmd /c npx prisma generate", 0, True
    WshShell.Run "cmd /c npx prisma db push", 0, True
End If
On Error GoTo 0

' ---- PASO 4: Verificar build, compilar si falta ----
If Not objFSO.FileExists(strDir & "\.next\BUILD_ID") Then
    ' Compilar
    If objFSO.FileExists(strDir & "\node_modules\.bin\next.cmd") Then
        WshShell.Run "cmd /c node_modules\.bin\next build", 0, True
    Else
        WshShell.Run "cmd /c npx next build", 0, True
    End If
    ' Copiar static a standalone
    WshShell.Run "cmd /c xcopy /E /I /Q /Y .next\static .next\standalone\.next\static", 0, True
    WshShell.Run "cmd /c xcopy /E /I /Q /Y public .next\standalone\public", 0, True
End If

' ---- PASO 5: Printer-Agent (oculto, puerto 9100) ----
If objFSO.FileExists(strDir & "\printer-agent\agent.js") Then
    WshShell.CurrentDirectory = strDir & "\printer-agent"
    WshShell.Run "cmd /c node agent.js > agent-startup.log 2>&1", 0, False
    WshShell.CurrentDirectory = strDir
End If
WScript.Sleep 1000

' ---- PASO 6: Firewall puerto 8443 ----
On Error Resume Next
WshShell.Run "cmd /c netsh advfirewall firewall delete rule name=""Nexus POS Mobile 8443"" >nul 2>&1", 0, True
WshShell.Run "cmd /c netsh advfirewall firewall add rule name=""Nexus POS Mobile 8443"" dir=in action=allow protocol=TCP localport=8443 profile=private,public", 0, True
On Error GoTo 0

' ---- PASO 7: Caddy Dominio (HTTPS nexusone.ve) ----
caddyDir = strDir & "\caddy"
caddyIniciado = False
If objFSO.FileExists(caddyDir & "\caddy.exe") Then
    ' Cargar Caddyfile principal si existe en caddy/ subcarpeta
    If objFSO.FileExists(caddyDir & "\Caddyfile") Then
        WshShell.CurrentDirectory = caddyDir
        WshShell.Run "cmd /c caddy.exe run --config Caddyfile > caddy-domain.log 2>&1", 0, False
        WshShell.CurrentDirectory = strDir
        caddyIniciado = True
    ElseIf objFSO.FileExists(strDir & "\Caddyfile") Then
        ' Fallback: Caddyfile en raiz
        WshShell.CurrentDirectory = strDir
        WshShell.Run "cmd /c caddy run --config Caddyfile > caddy-domain.log 2>&1", 0, False
        caddyIniciado = True
    End If
    WScript.Sleep 1500
End If

' ---- PASO 8: Caddy Movil (HTTPS :8443 para camara telefono) ----
If objFSO.FileExists(caddyDir & "\caddy.exe") Then
    If objFSO.FileExists(caddyDir & "\Caddyfile-mobile") Then
        WshShell.CurrentDirectory = caddyDir
        WshShell.Run "cmd /c caddy.exe run --config Caddyfile-mobile > caddy-mobile.log 2>&1", 0, False
        WshShell.CurrentDirectory = strDir
    End If
    WScript.Sleep 500
End If

' ---- PASO 9: Asegurar static en standalone ----
On Error Resume Next
If objFSO.FolderExists(strDir & "\.next\standalone") Then
    If Not objFSO.FolderExists(strDir & "\.next\standalone\.next\static") Then
        WshShell.Run "cmd /c xcopy /E /I /Q /Y .next\static .next\standalone\.next\static", 0, True
    End If
    If Not objFSO.FolderExists(strDir & "\.next\standalone\public") Then
        WshShell.Run "cmd /c xcopy /E /I /Q /Y public .next\standalone\public", 0, True
    End If
End If
On Error GoTo 0

' ---- PASO 10: Iniciar Next.js (oculto) ----
WshShell.CurrentDirectory = strDir
WshShell.Run "cmd /c npx next start -p 3000", 0, False

' ---- PASO 11: Esperar a que Next.js responda (hasta 60s) ----
Set objHTTP = CreateObject("MSXML2.XMLHTTP")
waited = 0
ready = False
Do While waited < 60 And Not ready
    WScript.Sleep 1000
    waited = waited + 1
    On Error Resume Next
    objHTTP.Open "GET", "http://localhost:3000", False
    objHTTP.setRequestHeader "If-None-Match", Chr(34) & "skip" & Chr(34)
    objHTTP.send ""
    If objHTTP.Status = 200 Then ready = True
    On Error GoTo 0
Loop

' ---- PASO 12: Abrir navegador ----
If caddyIniciado Then
    WshShell.Run "https://nexusone.ve"
Else
    WshShell.Run "http://localhost:3000"
End If
