---
author: Pierre Marcenac
title: Database Indexes Explained to Software Developers
date: 2021-02-04T10:52:59+08:00
description: A practical approach to database indexes with illustrations in Python.
math: true
categories: ['database', 'postgresql']
---

> "You'd better index your database!"
>
> As a software engineer, you've probably heard this sentence a few times. This blog post will guide you through understanding how indexing works.
>
> The code in this blog post executes by order of appearance. So I encourage you to follow along by copy/pasting it in a notebook. I used `Python 3.9`. You'll need the following dependencies: `pip install bplustree faker numpy tqdm`.

---

# A minimal database in Python

First, we will need a minimal database in Python. The very minimal features of a database are 1) `append` a new record and 2) `read` from the database.

```python
import uuid

DATABASE = './mini.db'
NEW_LINE = '\n'
SEPARATOR = ','

def append(new_entry: str):
    id = uuid.uuid4()
    with open(DATABASE, 'a') as database:
        database.write(f'{id}{SEPARATOR}{new_entry}{NEW_LINE}')

def read():
    with open(DATABASE, 'r') as database:
        print(database.read())
```

Let's try to write and read from this database:

```python
append('foo')
read()
# b680ec59-c54b-4040-a16d-be6768db3b2c,foo

append('bar')
read()
# b680ec59-c54b-4040-a16d-be6768db3b2c,foo
# d1bff2bd-b8b5-4b7f-9063-7d856d22794f,bar
```

Records pile up with a unique identifier (UUID) and the input name. So we just built a table with two columns: `UUID` and `Name`!

Using [`Faker`](https://github.com/joke2k/faker), we can even populate the newly created database with fake names.

```python
from faker import Faker
from tqdm import tqdm

NUMBER_OF_LINES = 1000000

fake = Faker()

def seed():
    for _ in tqdm(range(NUMBER_OF_LINES)):
        append(fake.name())

seed()
# 100%|██████████| 10000000/10000000 [30:58<00:00, 5381.77it/s]
```

The created database weighs approximately 489 MiB. Can we call this big data already? 😉

```bash
▶ ls mini.db
  rw-r--r--   1   pierre   staff     489 MiB   mini.db
```

We can choose a random row that we will use throughout the example.

```python
import random

def read_columns(line: str):
    return line.split(SEPARATOR)

def read_name(columns):
    return columns[1].replace(NEW_LINE, '')

with open(DATABASE) as database:
    lines = database.read().splitlines()
    random_line = random.choice(lines)
    columns = read_columns(random_line)

    RANDOM_ID = columns[0]
    print('This is a random line from our database:')
    print(random_line)

# This is a random line from our database:
# 5ca59471-a19b-4996-9c80-6b9379afae13,Bobby Stuart
```

Hello, Mr. Stuart! The goal of this article will be to retrieve the record `RANDOM_ID` (aka `Bobby Stuart`) using different techniques. To benchmark all these techniques, a Python decorator keeps track of time. The following decorator takes care of:

- calling the functions ten times to make sure we average the execution time on several calls to be statistically pertinent;
- computing the mean execution time and printing it back to the user.

```python
from functools import wraps
import numpy as np
from time import time

ITERATIONS = 10

def time_tracker():
    def _time_tracker(fn):
        @wraps(fn)
        def wrapped_fn(*args, **kwargs):
            elapsed_times = []

            for _ in range(ITERATIONS):
                start_time = time()
                result = fn(*args, **kwargs)
                elapsed_time = time() - start_time
                elapsed_times.append(elapsed_time)
            print(f'{fn.__name__:20} {np.mean(elapsed_times):.6f} seconds')
            return result

        return wrapped_fn
    return _time_tracker
```

---

# Table scan

The most obvious technique to retrieve a record is to scan the whole table going through all rows until we reach Bobby:

```python
@time_tracker()
def find(id: str):
    with open(DATABASE, 'r') as database:
        for line in database:
            columns = read_columns(line)
            if columns[0] == id:
                return read_name(columns)
        return None
```

Scanning the whole database took quite a while:

```python
name = find(RANDOM_ID)
print(name)

# find                 1.380667 seconds
# Bobby Stuart
```

The cost of this lookup is linear in the size of the database, which is computationally not acceptable in the era of big data. We call this algorithmic complexity `O(n)` where `n` is the number of rows in the database.

Now imagine our database was a bit more complex. For example, `persons` may have many `addresses`. If you are retrieving the address of a particular person, you'd have to look through all addresses of all persons (`O(n x m)`).

So, looking up a record on a big table is not an ordinary operation. Joining tables amplifies the problem. That's where indexes come to play.

---

# Hash indexes

You have already used indexes in books:

![Image](/index-book.jpeg)

In the above example, you'll be able to check all information related to `EventSource` on page 512.

We could design an index in a very similar way, _i.e._ have an external index keeping track of the position of each row. We will store this information in RAM as a Python dictionary called `HASH`. Retrieving a record:

![Image](/index-hash.png)

The keys of `HASH` are UUIDs of all records in the database. Its values are the corresponding row number.

```python
HASH = {}

@time_tracker()
def index_hash():
    with open(DATABASE, 'r') as database:
        for line_number, line in enumerate(database):
            columns = read_columns(line)
            HASH[columns[0]] = line_number
```

So `HASH` looks like this:

```
{
    ...
    "5ca59471-a19b-4996-9c80-6b9379afae13": 872363,
    ...
}
```

where `872363` is the row number corresponding to `Bobby Stuart` in the file `mini.db`.

Given a UUID, retrieving a record is now pretty trivial. I use `HASH` to see the corresponding row number in the database, then I use [`linecache`](https://docs.python.org/3/library/linecache.html) to get the record.

```python
import linecache

@time_tracker()
def find(id: str):
    line_number = HASH[id]
    return linecache.getline(DATABASE, line_number + 1)
```

Let's launch this:

```python
index_hash()
name = find(RANDOM_ID)
print(name)

# index_hash           6.261488 seconds
# find                 0.113469 seconds
# b4ff2b36-7a4f-45d6-b095-45701cad777b,Bobby Stuart
```

We say the time complexity is `O(1)` because we access records in constant time.

However, this indexing technique requires having the whole database in memory, which is not suitable for big data. Moreover, it only works for exact matching. Trying to retrieve all the records with a name that begins by `Bobby` would no longer be optimal with this technique.

> **Hash indexes**
>
> ✅ **Advantages**
>
> - Easy
> - Blazing fast (`O(1)`)
>
> ❌ **Drawbacks**
>
> - Only works for exact matching
> - In-memory

---

# Binary trees

Hash indexes have too many drawbacks. That's where binary trees (aka B-trees) come into play.

B-trees are a way to order data so that search, insertion, and deletion are easy. Searching a record through a B-tree looks like this:

![B-tree](/index-btree.png)

If the tree is balanced (_i.e._ all branches have the same number of nodes and leaves), we see that, at each node, you get to cut the remaining records to look for by half. So the maximal number of operations when looking up a record (or time complexity $C_n$) equals the tree height. Now, given there are `n` records in the database:

$$
\begin{align*}
C_{n+1} & = 2 \times C_{n} \\\\\\
n & \approx 2^{h}
\end{align*}
$$

So the complexity writes as:

$$
\begin{align*}
C_n \times \ln(2) & = \ln(n) \\\\\\
C_n & = \log_2(n)
\end{align*}
$$

The time complexity is `O(log(n))`.

I used [`bplustree`](https://github.com/NicolasLM/bplustree) to manipulate disk-persisted trees in Python. We build the B-tree index and use it in a few lines:

```python
from bplustree import BPlusTree, UUIDSerializer

TREE = BPlusTree(f'./tree-{random.random()}.index', serializer=UUIDSerializer(), key_size=16, page_size=10000)

def index_btree():
    with open(DATABASE, 'r') as database:
        for line_number, line in tqdm(enumerate(database), NUMBER_OF_LINES=NUMBER_OF_LINES):
            columns = read_columns(line)
            TREE.insert(uuid.UUID(columns[0]), line.encode())

@time_tracker()
def find(id: str):
    return TREE.get(uuid.UUID(id)).decode()
```

```python
index_btree()
name = find(RANDOM_ID)
print(name)

# find                 0.000467 seconds
# b4ff2b36-7a4f-45d6-b095-45701cad777b,Bobby Stuart
```

When computing the complexity, we saw it is primordial to keep the B-tree perfectly balanced. When inserting a new record, this may require splitting pages.

> **B-trees indexes**
>
> ✅ **Advantages**
>
> - Works in any metric space for huge amounts of data
> - Blazing fast
>
> ❌ **Drawbacks**
>
> - Um, this is probably the most-used type of index...

---

# GIN indexes

Real-life data is much more complex and structured than simple strings. For instance, to describe the current blog article, I could use the following JSON structures:

```
{
    "title": "Database Indexes",
    "tags": ["database", "postgresql"]
}
```

Most mainstream databases implement JSON support (JSONB in PostgreSQL, JSON in MySQL, BSON documents in MongoDB). This kind of data is harder to index than regular strings/numbers.

When scanning structured data, you'd likely be interested in:

- knowing whether an element belongs to an array (`"postgresql" IN 'tags'`)
- finding patterns with regular expressions (`'text' match "*indexes*"`)
- identifying lexemes in documents (`"explain" in 'text'`, `tsvector` in PostgreSQL)

For instance, if a database contains variations of a word: `identification`, `identifying`, `identified`, etc, when looking for `identify`, I would like to retrieve all the previous documents. Generalized Inverted Indexes (GIN) allow handling such composite data.

---

# Real life

Let's pop up a dockerized instance of PostgreSQL in the same directory where you created the data:

```bash
▶ docker pull postgres:14
▶ docker run --name postgres --mount type=bind,source="$(pwd)",target=/app -e POSTGRES_PASSWORD=foo postgres:14 postgres
```

In another tab, let's populate our database with the initial data:

```bash
▶ docker exec -it postgres bash
root@56e100e32bb4:/# psql -U postgres
psql (14.1 (Debian 14.1-1.pgdg110+1))
Type "help" for help.

postgres=# CREATE TABLE contacts (uuid TEXT, name TEXT);
postgres=# COPY contacts(uuid, name) FROM '/app/mini.db' DELIMITER ',' CSV;
```

Without indexing:

```bash
postgres=# \timing on
postgres=# SELECT * FROM contacts WHERE name LIKE 'Bobby%';
Time: 1040.061 ms (00:01.040)
```

After creating a GIN index on names:

```bash
postgres=# create extension pg_trgm;
postgres=# CREATE INDEX gin ON contacts USING GIN (name gin_trgm_ops);
CREATE INDEX
Time: 49202.558 ms (00:49.203)
postgres=# SELECT * FROM contacts WHERE name LIKE 'Bobby%';
Time: 105.556 ms
```

There you go: in this trivial scenario, GIN divided by 10 the response time of your PostgreSQL backend!

---

# Sum it up

Indexes are a must-have in databases. Looking up a record can prove costly when you manipulate large amounts of data and when you need to join data efficiently.

We saw three kinds of indexes:

- in-memory hash indexes for exact matching;
- B-tree indexes for ordered data;
- GIN indexes for complex structured data.

All popular databases (MySQL, PostgreSQL) implement these three indexes. But there are much more (LSM-trees, GiST). They will come in handy for all CPU-intensive lookups, so think of it before crashing your production database!
