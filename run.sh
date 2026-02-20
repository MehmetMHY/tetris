#!/bin/bash

# check if python is available
if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
	echo "Error: Python is required but not installed"
	exit 1
fi

# determine which python command to use
if command -v python3 &>/dev/null; then
	python_cmd="python3"
else
	python_cmd="python"
fi

# function to check if a port is available
is_port_available() {
	local port=$1
	if [[ "$OSTYPE" == "darwin"* ]]; then
		# macOS: use lsof
		lsof -i ":$port" &>/dev/null
		return $?
	else
		# Linux and other Unix-like systems: use netstat or ss
		if command -v ss &>/dev/null; then
			ss -tuln | grep -q ":$port "
			return $?
		else
			netstat -tuln 2>/dev/null | grep -q ":$port "
			return $?
		fi
	fi
}

# find an available port starting from 8000
port=8000
max_attempts=100
while is_port_available $port && [ $max_attempts -gt 0 ]; do
	port=$((port + 1))
	max_attempts=$((max_attempts - 1))
done

if [ $max_attempts -eq 0 ]; then
	echo "Error: Could not find an available port"
	exit 1
fi

echo "Starting HTTP server on http://localhost:$port"
echo "Press Ctrl+C to stop the server"

# open the browser
url="http://localhost:$port"
if [[ "$OSTYPE" == "darwin"* ]]; then
	open "$url" &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
	xdg-open "$url" &
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
	start "$url" &
else
	echo "Error: Unsupported operating system"
	exit 1
fi

# start the http server
$python_cmd -m http.server $port
