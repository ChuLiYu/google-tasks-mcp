#!/usr/bin/env python3
"""Owner-only launcher. No secret values in arguments, output or generated profiles."""
import fcntl
import http.client
import json
import os
from pathlib import Path
import re
import secrets
import signal
import stat
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / '.data'
# Host-only: never mounted into a container, so a compromised service cannot alter what the host runs.
HOST = ROOT / '.host'
COMPOSE = ['docker', 'compose', '-f', str(ROOT / 'containers/google-compose.yaml')]


def private_directories():
    for path in [DATA, HOST, HOST / 'tunnel', HOST / 'tunnel/profiles']:
        info = path.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
            raise ValueError('Private directories must be owned by you, non-symlink and mode 700.')


def private_file(path):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise ValueError('Private file must be owned by you, regular, and mode 600.')
    return path.read_text().strip()


def token():
    private_directories()
    value = private_file(DATA / 'private-http.token')
    if not re.fullmatch('[a-f0-9]{64}', value):
        raise ValueError('Invalid local MCP credential.')
    return value


def probe(url):
    try:
        # Explicitly bypass environment proxies for local-only checks.
        with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(url, timeout=2) as response:
            return response.status == 200
    except (OSError, ValueError, http.client.HTTPException):
        return False


def prepare():
    private_directories()
    for name in ['google-client.json', 'google.sqlite', 'vault.key']:
        info = (DATA / name).lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
            raise ValueError('Complete owner-run Google connection first; local secrets must be mode 600.')
    key = DATA / 'private-http.token'
    if not key.exists():
        fd = os.open(key, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as output:
            output.write(secrets.token_hex(32))
    token()
    # Reuse the existing tunnel association without copying secret material.
    source = private_file(HOST / 'tunnel/profiles/google-tasks-readonly.yaml')
    ids = re.findall(r'^\s*tunnel_id:\s*[\"\']?(tunnel_[a-zA-Z0-9_-]+)[\"\']?\s*$', source, re.M)
    if len(ids) != 1:
        raise ValueError('Existing readonly profile has no unique tunnel ID.')
    profile = HOST / 'tunnel/profiles/google-tasks-readonly-http.yaml'
    if profile.is_symlink():
        raise ValueError('Profile symlink refused.')
    content = ('config_version: 1\ncontrol_plane:\n  base_url: https://api.openai.com\n'
               f'  tunnel_id: {ids[0]}\n  api_key: env:CONTROL_PLANE_API_KEY\n'
               'health:\n  listen_addr: 127.0.0.1:0\nadmin_ui:\n  open_browser: false\n'
               'log:\n  level: warn\n  format: json\nmcp:\n  server_urls:\n'
               '    - channel: main\n      url: http://127.0.0.1:3002/mcp\n'
               f'  extra_headers:\n    X-Tasks-Local-Key: file:{key}\n'
               f'  discovery_extra_headers:\n    X-Tasks-Local-Key: file:{key}\n')
    fd = os.open(profile, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    os.fchmod(fd, 0o600)
    with os.fdopen(fd, 'w') as output:
        output.write(content)


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ['start', 'status', 'stop', 'headers']:
        raise ValueError('Usage: python3 scripts/private-stack.py start|status|stop|headers')
    action = sys.argv[1]
    if action == 'headers':
        print(json.dumps({'X-Tasks-Local-Key': token()}))
        return
    if action == 'status':
        print('Local MCP: ' + ('ready' if probe('http://127.0.0.1:3002/health') else 'not ready'))
        try:
            url = (HOST / 'tunnel/shared-health-url').read_text().strip()
            valid = re.fullmatch(r'http://127\.0\.0\.1:[0-9]+', url)
            ready = bool(valid) and probe(url + '/readyz')
        except OSError:
            ready = False
        print('Secure MCP Tunnel: ' + ('ready' if ready else 'not ready'))
        return
    pidfile = HOST / 'private-stack.pid'
    if action == 'stop':
        pid = int(private_file(pidfile))
        command = subprocess.check_output(['ps', '-p', str(pid), '-o', 'command='], text=True)
        if str(Path(__file__).resolve()) + ' start' not in command:
            raise ValueError('Saved process does not match this launcher; nothing stopped.')
        os.kill(pid, signal.SIGTERM)
        print('Stop requested; existing credentials and data retained.')
        return
    def stopped(_signal, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, stopped)
    # Closing the Terminal window sends SIGHUP; stop the service rather than orphan it.
    signal.signal(signal.SIGHUP, stopped)
    private_directories()
    lockpath = HOST / 'private-stack.lock'
    fd = os.open(lockpath, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        prepare()
        # Never take over a previous stdio client or retained database lock.
        result = subprocess.run(['docker', 'ps', '-q', '--filter',
                                 'name=^/google-tasks-mcp-private-stdio$'], capture_output=True, text=True, check=True)
        if result.stdout.strip():
            raise ValueError('Stop the previous readonly stdio Tunnel before using the shared stack.')
        child = None
        try:
            # Cleanup also covers a signal while detached Compose startup is in progress.
            subprocess.run(COMPOSE + ['up', '-d', '--wait', '--no-build', '--pull', 'never'], check=True)
            pidfd = os.open(pidfile, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
            os.fchmod(pidfd, 0o600)
            with os.fdopen(pidfd, 'w') as output:
                output.write(str(os.getpid()))
            # A stale URL from an earlier client must not report READY for this one.
            (HOST / 'tunnel/shared-health-url').unlink(missing_ok=True)
            child = subprocess.Popen(['/bin/zsh', str(ROOT / 'scripts/start-private-tunnel.zsh'), 'shared'])
            print('Local MCP started. Connecting Secure MCP Tunnel; keep this window open.', flush=True)
            for _ in range(20):
                if child.poll() is not None:
                    raise ValueError('Tunnel stopped before readiness. Check .env and local setup.')
                time.sleep(1)
                try:
                    url = (HOST / 'tunnel/shared-health-url').read_text().strip()
                    if re.fullmatch(r'http://127\.0\.0\.1:[0-9]+', url) and probe(url + '/readyz'):
                        print('READY: Codex local MCP + ChatGPT Secure MCP Tunnel. Ctrl-C stops both.', flush=True)
                        break
                except OSError:
                    pass
            else:
                print('Tunnel is not ready yet. Run status; do not assume the Web connection works.', flush=True)
            if child.wait() != 0:
                raise ValueError('Tunnel stopped unexpectedly.')
        except KeyboardInterrupt:
            pass
        finally:
            if child is not None and child.poll() is None:
                child.terminate()
                try:
                    child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    child.kill(); child.wait()
            subprocess.run(COMPOSE + ['stop'], check=False)
            pidfile.unlink(missing_ok=True)


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, subprocess.SubprocessError, http.client.HTTPException):
        # No exception payloads: errors can contain private paths or response bodies.
        print('Private stack action failed. Check OrbStack, existing clients, file permissions and setup guide.', file=sys.stderr)
        sys.exit(1)
