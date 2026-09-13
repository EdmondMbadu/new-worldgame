"""Package the CC0 Quaternius Casual_2 glTF into a small, local animated GLB.

Usage: python3 scripts/prepare-staff.py /path/to/Casual_2.gltf
Keeps only civilian idle, walking, interaction and waving clips and their buffers.
"""
import base64
import hashlib
import json
from pathlib import Path
import struct
import sys

source = Path(sys.argv[1])
doc = json.loads(source.read_text())
doc['animations'] = [a for a in doc['animations'] if a['name'] in ['Idle_Neutral', 'Walk', 'Wave', 'Interact']]
# Collapse constant channels to one key; keep the authored value for clean cross-fades.
raw = base64.b64decode(doc['buffers'][0]['uri'].split(',')[1])
widths={'SCALAR':1,'VEC3':3,'VEC4':4}
for animation in doc['animations']:
    for sampler in animation['samplers']:
        out=doc['accessors'][sampler['output']]
        view=doc['bufferViews'][out['bufferView']]
        width=widths.get(out['type'],0)
        if not width or out['componentType']!=5126 or out['count']<2:continue
        start=view.get('byteOffset',0)+out.get('byteOffset',0)
        stride=view.get('byteStride',width*4)
        first=struct.unpack_from('<'+'f'*width,raw,start)
        constant=all(all(abs(a-b)<1e-5 for a,b in zip(first,struct.unpack_from('<'+'f'*width,raw,start+i*stride))) for i in range(1,out['count']))
        if constant:
            inp=doc['accessors'][sampler['input']].copy();inp['count']=1
            v=doc['bufferViews'][inp['bufferView']]
            t=struct.unpack_from('<f',raw,v.get('byteOffset',0)+inp.get('byteOffset',0))[0]
            inp['min']=inp['max']=[t]
            out=out.copy();out['count']=1
            sampler['input']=len(doc['accessors']);doc['accessors'].append(inp)
            sampler['output']=len(doc['accessors']);doc['accessors'].append(out)
accessors = set()
for mesh in doc['meshes']:
    for primitive in mesh['primitives']:
        accessors.update(primitive['attributes'].values())
        if 'indices' in primitive: accessors.add(primitive['indices'])
for skin in doc['skins']:
    accessors.add(skin['inverseBindMatrices'])
for animation in doc['animations']:
    for sampler in animation['samplers']:
        accessors.update([sampler['input'], sampler['output']])
accessor_map = {old:new for new,old in enumerate(sorted(accessors))}
data = base64.b64decode(doc['buffers'][0]['uri'].split(',')[1])
packed = bytearray()
new_views = []
new_accessors = []
components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
bytes_per={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
for i in sorted(accessors):
    a=doc['accessors'][i].copy()
    v=doc['bufferViews'][a['bufferView']]
    packed += bytes((-len(packed))%4)
    start=len(packed)
    size=components[a['type']]*bytes_per[a['componentType']]
    offset=v.get('byteOffset',0)+a.get('byteOffset',0)
    stride=v.get('byteStride',size)
    for n in range(a['count']):packed+=data[offset+n*stride:offset+n*stride+size]
    new_views.append({'buffer':0,'byteOffset':start,'byteLength':len(packed)-start})
    a['bufferView']=len(new_views)-1
    a.pop('byteOffset',None)
    new_accessors.append(a)
doc['bufferViews']=new_views
doc['accessors']=new_accessors
for mesh in doc['meshes']:
    for p in mesh['primitives']:
        p['attributes']={k:accessor_map[v] for k,v in p['attributes'].items()}
        if 'indices' in p:p['indices']=accessor_map[p['indices']]
for skin in doc['skins']:skin['inverseBindMatrices']=accessor_map[skin['inverseBindMatrices']]
for animation in doc['animations']:
    for sampler in animation['samplers']:
        for key in ['input','output']:sampler[key]=accessor_map[sampler[key]]
# Deduplicate identical tracks/attributes, including constant pose channels shared by clips.
canonical={}
remap={}
unique=[]
unique_views=[]
compact=bytearray()
for i,a in enumerate(doc['accessors']):
    view=doc['bufferViews'][a['bufferView']]
    payload=bytes(packed[view['byteOffset']:view['byteOffset']+view['byteLength']])
    meta={k:v for k,v in a.items() if k not in ['bufferView','byteOffset']}
    key=(json.dumps(meta,sort_keys=True),payload)
    if key not in canonical:
        canonical[key]=len(unique)
        compact+=bytes((-len(compact))%4)
        unique_views.append({'buffer':0,'byteOffset':len(compact),'byteLength':len(payload)})
        compact+=payload
        unique.append({**meta,'bufferView':len(unique_views)-1})
    remap[i]=canonical[key]
for mesh in doc['meshes']:
    for primitive in mesh['primitives']:
        primitive['attributes']={k:remap[v] for k,v in primitive['attributes'].items()}
        if 'indices' in primitive:primitive['indices']=remap[primitive['indices']]
for skin in doc['skins']:skin['inverseBindMatrices']=remap[skin['inverseBindMatrices']]
for animation in doc['animations']:
    for sampler in animation['samplers']:
        for key in ['input','output']:sampler[key]=remap[sampler[key]]
doc['accessors']=unique
doc['bufferViews']=unique_views
packed=compact
doc['buffers']=[{'byteLength':len(packed)}]
doc['asset']['copyright']='Quaternius · Casual_2 · Ultimate Modular Men · CC0'
doc['asset']['extras']={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()}
blob=json.dumps(doc,separators=(',',':')).encode()
blob+=b' '*((-len(blob))%4)
packed+=bytes((-len(packed))%4)
out=Path(__file__).resolve().parent.parent/'public/models/clinic-staff.glb'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_bytes(struct.pack('<III',0x46546c67,2,28+len(blob)+len(packed))+struct.pack('<II',len(blob),0x4e4f534a)+blob+struct.pack('<II',len(packed),0x004e4942)+packed)
print(f'{out.name}: {out.stat().st_size:,} bytes; {len(doc["animations"])} clips')
