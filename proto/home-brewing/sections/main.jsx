const params = new URLSearchParams(location.search)
params.delete("part")
params.set("v", "2")
location.replace(`../?${params}`)
