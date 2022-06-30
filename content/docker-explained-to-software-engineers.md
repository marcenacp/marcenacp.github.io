---
author: Pierre Marcenac
title: Docker Explained to Software Engineers
date: 2022-02-26T10:52:59+08:00
description: Re-implement a fully-isolated container from scratch
math: true
categories: ['devops', 'docker']
---

# Set up

I don't know your OS.
So we will work within an Ubuntu container.
From this container, we will build up a container.

To sum it, we are going to implement a Docker-in-Docker.

Start a regular Ubuntu Docker container:

```bash
▶ docker run -it --name docker_tutorial --security-opt seccomp:unconfined ubuntu:22.04 /bin/bash
Unable to find image 'ubuntu:22.04' locally
22.04: Pulling from library/ubuntu
c610536171e3: Pull complete
Digest: sha256:a02c32cf0c2a7e8743c74deef66637aa70e063c9bd40e9e1f8c0b3ea0750b0ba
Status: Downloaded newer image for ubuntu:22.04
262653d91f02cb91e199e71d77026c908034ce47d4bc396842f9e960e6b850e5
root@d827602e3da8:/#
```

Your machine is called the host.
Inside this host, we just started an Ubuntu container.
Inside this container, we are going to code up

```bash
root@1d0df26787e8:/# apt update
```

```bash
root@1d0df26787e8:/# apt install -y git python3 tree
root@1d0df26787e8:/# git clone https://github.com/marcenacp/docker-training.git
root@1d0df26787e8:/# cd docker-training/rootfs
```

```bash
root@1d0df26787e8:/docker-training/rootfs# tree -v -L 2
```

This does look like the typical tree structure of a Unix filesystem.

# Filesystem isolation

The first feature of a Docker container is that it cannot read files outside of its scope.
The container is fully isolated from its host from a filesystem perspective.

Unix has had such a tool for years now: `chroot`!

> A `chroot` on Unix is an operation that changes the apparent root directory for the current running process and its children. [Wikipedia]

Check that Python is not installed:

```bash
root@1d0df26787e8:/docker-training/rootfs# python
bash: python: command not found
```

```bash
root@1d0df26787e8:/docker-training/rootfs# chroot . /bin/bash
root@1d0df26787e8:/#
```

You noticed that `/docker-training/rootfs` just became `/`.

```bash
root@1d0df26787e8:/# ls /
bin  dev  etc  lib  lib64  run  sbin  usr  var
root@1d0df26787e8:/# /usr/bin/python -c 'print "Hello, container world!"'
Hello, container world!
```

What kind of sorcery is this?
This does look like a container.

# Namespaces

- Outside of any docker container
- Inside the first docker image
- Inside the docker-in-docker

```bash
# In local

# In docker
▶ docker exec -it docker_tutorial /bin/bash
root@1d0df26787e8:/#

# In docker-in-docker
root@1d0df26787e8:/# chroot /docker-training/rootfs /bin/bash
root@1d0df26787e8:/#
```

```bash
# In docker
top

top - 16:35:13 up 17:44,  0 users,  load average: 0.16, 0.06, 0.03
Tasks:   2 total,   1 running,   1 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.3 us,  0.8 sy,  0.0 ni, 98.9 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :  14000.9 total,   9312.8 free,    430.2 used,   4258.0 buff/cache
MiB Swap:   1024.0 total,   1024.0 free,      0.0 used.  12927.1 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 3339 root      20   0    7304   3500   2952 R   0.3   0.0   0:00.01 top
    1 root      20   0    4608   3876   3292 S   0.0   0.0   0:00.08 bash
```

Let's go back inside the Docker-in-Docker:

```bash
root@1d0df26787e8:/# chroot /docker-training/rootfs /bin/bash
```

```bash
mount -t proc proc /proc
ps aux | grep top
kill top
sudo unshare -p -f --mount-proc=$PWD/rootfs/proc chroot rootfs /bin/bash
ps aux

# ENTERING NAMESPACES WITH NSENTER: if I create another session
ps aux | grep /bin/bash | grep root # outside of container
ls -l /proc/29840/
sudo nsenter --pid=/proc/19896/ns/pid \
    unshare -f --mount-proc=$PWD/rootfs/proc \
    chroot rootfs /bin/bash
ps aux
# isolated PID namespaces, but same network namespace: kubectl pods


# GETTING AROUND CHROOT WITH MOUNTS
sudo mkdir readonlyfiles
echo "hello" > readonlyfiles/hi.txt
sudo mkdir -p rootfs/var/readonlyfiles
sudo mount --bind -o ro $PWD/readonlyfiles $PWD/rootfs/var/readonlyfiles
sudo chroot rootfs /bin/bash
cat /var/readonlyfiles/hi.txt
echo "bye" > /var/readonlyfiles/hi.txt
sudo umount $PWD/rootfs/var/readonlyfiles

# CGROUPS = CONTROL GROUPS
ll /sys/fs/cgroup/
sudo su
mkdir /sys/fs/cgroup/memory/demo
ls /sys/fs/cgroup/memory/demo/
echo "100000000" > /sys/fs/cgroup/memory/demo/memory.limit_in_bytes
echo "0" > /sys/fs/cgroup/memory/demo/memory.swappiness
echo $$ > /sys/fs/cgroup/memory/demo/tasks
cat /dev/urandom
f = open("/dev/urandom", "r")
data = ""
i=0
while True:
    data += f.read(10000000) # 10mb
    i += 1
    print "%dmb" % (i*10,)
python hungry.py
sudo rmdir /sys/fs/cgroup/memory/demo
