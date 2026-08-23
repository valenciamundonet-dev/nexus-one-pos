' ============================================================
' Nexus One POS v2.9.79 - Iniciar TODO en modo oculto (OPTIMIZADO)
' Inicia servicios SIN ventanas CMD:
'   1. Printer-Agent (9100) - impresion termica winspool
'   2. Caddy Dominio (443) - HTTPS nexusone.ve (PC)
'   3. Caddy Movil (8443) - HTTPS IP local (camara telefono)
'   4. Next.js (3000) - aplicacion web
'
' Mejoras vs v2.9.72:
'   - Refresca PATH desde registro (por si Node se instalo recien)
'   - Ejecuta prisma db push si no hay BD (evita "table not exist")
'   - Ejecuta next build si no hay build (evita "no production build")
'   - Espera a que Next.js responda antes de abrir navegador
' ============================================================

Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
WshShell.CurrentDirectory = objFSO.GetParentFolderName(WScript.ScriptFullName)
strDir = WshShell.CurrentDirectory

' -- PASO 0: Refrescar PATH desde registro (por si Node se instalo recien) --
On Error Resume Next
Set objShell2 = CreateObject("WScript.Shell")
Set objReg = GetObject("winmgmts:\\.\root\default:StdRegProv")
objReg.GetStringValue &H80000002, "SYSTEM\CurrentControlSet\Control\Session Manager\Environment", "Path", sysPath
objReg.GetStringValue &H80000001, "Environment", "Path", usrPath
newPath = ""
If sysPath <> "" Then newPath = sysPath & ";"
If usrPath <> "" Then newPath = newPath & usrPath & ";"
If newPath <> "" Then
    curPath = objShell2.ExpandEnvironmentStrings("%PATH%")
    objShell2.Environment("PROCESS").Item("PATH") = newPath & curPath
End If
On Error GoTo 0

' -- PASO 1: Matar procesos anteriores (WMI, no taskkill) --
On Error Resume Next
Set objWMI = GetObject("winmgmts:\\.\root\cimv2")
Set colProcs = objWMI.ExecQuery("SELECT * FROM Win32_Process WHERE Name='node.exe'")
For Each p In colProcs: p.Terminate(): Next
WScript.Sleep 500
Set colProcs = objWMI.ExecQuery("SELECT * FROM Win32_Process WHERE Name='caddy.exe'")
For Each p In colProcs: p.Terminate(): Next
On Error GoTo 0
WScript.Sleep 2000

' -- PASO 2: Detectar IP local --
WshShell.Run "cmd /c powershell -NoProfile -Command ""$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' } | Select-Object -First 1 -ExpandProperty IPAddress); if (-not $ip) { $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { -not $_.Loopback -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress) }; Write-Output $ip"" > """ & strDir & "\caddy\local-ip.txt"" 2>nul", 0, True

' -- PASO 3: Verificar/crear BD si no existe (evita "table not exist") --
If Not objFSO.FileExists(strDir & "\prisma\dev.db") Then
    WshShell.Run "cmd /c npx prisma db push --skip-generate", 0, True
End If

' -- PASO 4: Verificar build, compilar si no existe (evita "no production build") --
If Not objFSO.FileExists(strDir & "\.next\BUILD_ID") Then
    WshShell.Run "cmd /c npx next build", 0, True
End If

' -- PASO 5: Printer-Agent (oculto, puerto 9100) --
If objFSO.FileExists(strDir & "\printer-agent\agent.js") Then
    WshShell.CurrentDirectory = strDir & "\printer-agent"
    WshShell.Run "cmd /c node agent.js > agent-startup.log 2>&1", 0, False
    WshShell.CurrentDirectory = strDir
End If
WScript.Sleep 1000

' -- PASO 6: Firewall puerto 8443 --
On Error Resume Next
WshShell.Run "cmd /c netsh advfirewall firewall delete rule name=""Nexus POS Mobile 8443"" >nul 2>&1", 0, True
WshShell.Run "cmd /c netsh advfirewall firewall add rule name=""Nexus POS Mobile 8443"" dir=in action=allow protocol=TCP localport=8443 profile=private,public", 0, True
On Error GoTo 0

' -- PASO 7: Caddy Dominio (HTTPS nexusone.ve) --
caddyDir = strDir & "\caddy"
caddyIniciado = False
If objFSO.FileExists(caddyDir & "\caddy.exe") Then
    If objFSO.FileExists(caddyDir & "\Caddyfile") Then
        WshShell.CurrentDirectory = caddyDir
        WshShell.Run "cmd /c caddy.exe run --config Caddyfile > caddy-domain.log 2>&1", 0, False
        WshShell.CurrentDirectory = strDir
        caddyIniciado = True
    End If
End If

' -- PASO 8: Caddy Movil (HTTPS :8443 para camara telefono) --
If objFSO.FileExists(caddyDir & "\caddy.exe") Then
    If objFSO.FileExists(caddyDir & "\Caddyfile-mobile") Then
        WshShell.CurrentDirectory = caddyDir
        WshShell.Run "cmd /c caddy.exe run --config Caddyfile-mobile > caddy-mobile.log 2>&1", 0, False
        WshShell.CurrentDirectory = strDir
    End If
End If

' -- PASO 9: Copiar static a standalone (si existe) --
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

' -- PASO 10: Iniciar Next.js (oculto) --
WshShell.CurrentDirectory = strDir
WshShell.Run "cmd /c npx next start -p 3000", 0, False

' -- PASO 11: Esperar a que Next.js responda (hasta 60s) --
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

' -- PASO 12: Abrir navegador --
If caddyIniciado Then
    WshShell.Run "https://nexusone.ve"
Else
    WshShell.Run "http://localhost:3000"
End If
