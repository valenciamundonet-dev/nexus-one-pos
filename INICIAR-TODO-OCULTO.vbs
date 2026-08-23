' ============================================================
' Nexus One POS v2.9.78 - Iniciar TODO en modo oculto
' Inicia 4 servicios SIN abrir ventanas CMD:
'   1. Printer-Agent (puerto 9100) - impresion termica
'   2. Caddy Dominio (puerto 443) - HTTPS nexusone.ve (PC)
'   3. Caddy Movil (puerto 8443) - HTTPS IP local (telefono, camara)
'   4. Next.js (puerto 3000) - aplicacion web
' ============================================================

Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
WshShell.CurrentDirectory = objFSO.GetParentFolderName(WScript.ScriptFullName)
strDir = WshShell.CurrentDirectory

' -- PASO 1: Matar procesos anteriores --
On Error Resume Next
Set objWMI = GetObject("winmgmts:\\.\root\cimv2")
Set colProcs = objWMI.ExecQuery("SELECT * FROM Win32_Process WHERE Name='node.exe'")
For Each p In colProcs: p.Terminate(): Next
Set colProcs = objWMI.ExecQuery("SELECT * FROM Win32_Process WHERE Name='caddy.exe'")
For Each p In colProcs: p.Terminate(): Next
On Error GoTo 0
WScript.Sleep 2000

' -- PASO 2: Detectar IP local --
WshShell.Run "cmd /c powershell -NoProfile -Command ""$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' } | Select-Object -First 1 -ExpandProperty IPAddress); if (-not $ip) { $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { -not $_.Loopback -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress) }; Write-Output $ip"" > """ & strDir & "\caddy\local-ip.txt"" 2>nul", 0, True

' -- PASO 3: Asegurar BD existe (prisma db push silencioso) --
WshShell.Run "cmd /c npx prisma generate >nul 2>&1 && npx prisma db push --skip-generate >nul 2>&1", 0, True

' -- PASO 4: Asegurar build existe --
If Not objFSO.FileExists(strDir & "\.next\BUILD_ID") Then
    WshShell.Run "cmd /c npx next build", 0, True
End If

' -- PASO 5: Iniciar Printer-Agent (oculto) --
WshShell.CurrentDirectory = strDir & "\printer-agent"
WshShell.Run "cmd /c node agent.js > agent-startup.log 2>&1", 0, False
WshShell.CurrentDirectory = strDir
WScript.Sleep 1000

' -- PASO 6: Abrir puerto 8443 en firewall --
On Error Resume Next
WshShell.Run "cmd /c netsh advfirewall firewall delete rule name=""Nexus One POS Mobile 8443"" >nul 2>&1", 0, True
WshShell.Run "cmd /c netsh advfirewall firewall add rule name=""Nexus One POS Mobile 8443"" dir=in action=allow protocol=TCP localport=8443 profile=private,public", 0, True
On Error GoTo 0

' -- PASO 7: Iniciar Caddy Dominio (oculto, HTTPS nexusone.ve) --
caddyDir = strDir & "\caddy"
caddyIniciado = False
If objFSO.FileExists(caddyDir & "\caddy.exe") Then
    WshShell.CurrentDirectory = caddyDir
    WshShell.Run "cmd /c caddy.exe run --config Caddyfile > caddy-domain.log 2>&1", 0, False
    WshShell.CurrentDirectory = strDir
    caddyIniciado = True
End If

' -- PASO 8: Iniciar Caddy Movil (oculto, HTTPS :8443) --
If objFSO.FileExists(caddyDir & "\caddy.exe") Then
    If objFSO.FileExists(caddyDir & "\Caddyfile-mobile") Then
        WshShell.CurrentDirectory = caddyDir
        WshShell.Run "cmd /c caddy.exe run --config Caddyfile-mobile > caddy-mobile.log 2>&1", 0, False
        WshShell.CurrentDirectory = strDir
    End If
End If

' -- PASO 9: Iniciar Next.js (oculto) --
WshShell.CurrentDirectory = strDir
WshShell.Run "cmd /c npx next start -p 3000", 0, False

' -- PASO 10: Esperar a que Next.js responda --
Set objHTTP = CreateObject("MSXML2.XMLHTTP")
maxWait = 60
waited = 0
ready = False
Do While waited < maxWait And Not ready
    WScript.Sleep 1000
    waited = waited + 1
    On Error Resume Next
    objHTTP.Open "GET", "http://localhost:3000", False
    objHTTP.setRequestHeader "If-None-Match", Chr(34) & "skip" & Chr(34)
    objHTTP.send ""
    If objHTTP.Status = 200 Then ready = True
    On Error GoTo 0
Loop

' -- PASO 11: Abrir navegador --
If caddyIniciado Then
    WshShell.Run "https://nexusone.ve"
Else
    WshShell.Run "http://localhost:3000"
End If
