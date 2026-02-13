# SPL-lite Guide (Search Processing Language)

Simulate Splunk's powerful analytics using pipes (`|`).

## Supported Commands

1.  **search**: Filter logs (Default).
    - `sourcetype=win_event_log`
    - `is_malicious=true`

2.  **stats**: Aggregate data.
    - `stats count by source_ip`
    - `stats count by action`
    - `stats count by sourcetype`

3.  **sort**: Order results.
    - `sort count` (Ascending)
    - `sort -count` (Descending)

4.  **head**: Limit results.
    - `head 5`

5.  **table**: Select columns.
    - `table timestamp, action, user_id`

6.  **rex**: Extract fields (Regex).
    - `rex field=resource_id "user=(?<extracted_user>\w+)"`

## Examples to Try

**1. Who is attacking us?**

**1. Who is attacking us?**
```
is_malicious=true | stats count by source_ip | sort -count
```

**2. What are users doing?**
```
sourcetype=access_combined | stats count by action
```

**3. Recent Login Failures**
```
action=LoginFailed | table timestamp, user_id, source_ip | head 10
```

**4. Extract Filenames (Advanced)**
```
action=FileWrite | rex field=resource_id "/(?<filename>[^/]+)$" | stats count by filename
```
