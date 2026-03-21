(*
  一键启动本地开发服务（导出为「应用程序」后双击运行）

  使用前请按需修改下方 property：
  - bundleDisplayName：与导出 .app 时的显示名称一致即可
  - projectPath：项目根目录（含 package.json）
  - devPort：与 openURL 端口一致；传给 Vite：--port / --strictPort
  - logFile：安装与 dev 日志追加路径
  - readySeconds：等待服务就绪的超时（秒）

  包管理器：本机存在 pnpm 则用 pnpm，否则 npm。
  所有 shell 子命令经 /bin/zsh -lic，以加载 Homebrew、nvm、fnm 等 PATH。
*)

property bundleDisplayName : "Elis Dev"
property projectPath : "/Users/yuchao/Documents/GitHub/Elis"
property devPort : "5178"
property logFile : "/tmp/elis_dev.log"
property readySeconds : 90

on run
	set openURL to "http://localhost:" & devPort
	set qProj to quoted form of projectPath
	set qLog to quoted form of logFile
	set qNM to quoted form of (projectPath & "/node_modules")
	
	-- 分隔线写入日志，便于多次启动区分
	set header to "===== " & bundleDisplayName & " " & (current date as string) & " ====="
	try
		do shell script "/bin/zsh -lic " & quoted form of ("printf '%s\\n' " & quoted form of header & " >> " & qLog)
	end try
	
	display notification "正在检查项目与依赖…" with title bundleDisplayName
	
	set depState to "unknown"
	try
		set depState to do shell script "/bin/zsh -lic " & quoted form of ("[ -d " & qNM & " ] && echo installed || echo missing")
	end try
	
	if depState is "missing" then
		display notification "未检测到 node_modules，将先安装依赖（详见日志）…" with title bundleDisplayName
	end if
	
	display notification "正在启动开发服务（端口 " & devPort & "）…" with title bundleDisplayName
	
	-- nohup + 重定向，避免 do shell script 结束后子进程被挂断
	set zshBody to "set -euo pipefail; cd " & qProj & " || exit 1; LOG=" & qLog & "; if command -v pnpm >/dev/null 2>&1; then PM=pnpm; else PM=npm; fi; if [[ ! -d node_modules ]]; then printf '%s installing dependencies (%s install)...\\n' \"[$(date '+%Y-%m-%d %H:%M:%S')]\" \"$PM\" | tee -a \"$LOG\"; $PM install >> \"$LOG\" 2>&1; fi; printf '%s starting dev (port " & devPort & ")...\\n' \"[$(date '+%Y-%m-%d %H:%M:%S')]\" | tee -a \"$LOG\"; nohup $PM run dev -- --port " & devPort & " --strictPort >> \"$LOG\" 2>&1 </dev/null & disown 2>/dev/null || true"
	
	try
		do shell script "/bin/zsh -lic " & quoted form of zshBody
	on error errMsg number errNum
		display dialog "启动脚本执行失败：" & return & return & errMsg & return & return & "请查看日志：" & logFile buttons {"好"} default button 1 with title bundleDisplayName with icon stop
		return
	end try
	
	-- 等待 HTTP 就绪
	set ready to false
	repeat with i from 1 to readySeconds
		try
			set code to do shell script "/bin/zsh -lic " & quoted form of ("curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 1 --max-time 2 " & quoted form of openURL)
			if code starts with "2" or code is "304" then
				set ready to true
				exit repeat
			end if
		end try
		delay 1
	end repeat
	
	if ready then
		try
			do shell script "/bin/zsh -lic " & quoted form of ("open " & quoted form of openURL)
		end try
		display notification "开发服务已就绪：" & openURL with title bundleDisplayName
	else
		display dialog "在 " & readySeconds & " 秒内未能检测到服务就绪（" & openURL & "）。" & return & return & "可能原因：依赖安装失败、端口被占用（已使用 --strictPort）、或启动较慢。" & return & return & "请打开日志文件查看详情：" & logFile buttons {"好"} default button 1 with title bundleDisplayName with icon caution
	end if
end run
