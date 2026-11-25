#!/usr/bin/env python3
"""Offline QA renderer for exported procedural Cordon scene geometry.

Requires Python packages: vtk, numpy, Pillow (VTK is not part of the game runtime).
Run: python scripts/render-preview.py /tmp/rookie-village.json screenshots/01-cordon-village.png
"""
from pathlib import Path
import json, sys
import numpy as np
import vtk
from vtk.util.numpy_support import numpy_to_vtk, numpy_to_vtkIdTypeArray

if len(sys.argv) < 3:
    raise SystemExit('Usage: render-preview.py scene.json output.png [wide|gameplay|first-person|character]')
root = Path(__file__).resolve().parents[1]
src, out = Path(sys.argv[1]), Path(sys.argv[2])
mode = sys.argv[3] if len(sys.argv) > 3 else 'wide'
scene = json.loads(src.read_text(encoding='utf-8'))

rw = vtk.vtkRenderWindow(); rw.SetOffScreenRendering(1); rw.SetSize(1600, 1000); rw.SetMultiSamples(4)
ren = vtk.vtkRenderer(); rw.AddRenderer(ren); ren.SetBackground(.075, .095, .085); ren.SetBackground2(.23, .27, .22); ren.SetGradientBackground(True)
reader = vtk.vtkPNGReader(); reader.SetFileName(str(root / 'assets/textures/cordon-materials.png')); reader.Update()
texture = vtk.vtkTexture(); texture.SetInputConnection(reader.GetOutputPort()); texture.InterpolateOn(); texture.RepeatOff(); texture.MipmapOn(); texture.EdgeClampOn()
# The terrain has map UVs and needs the source overhead map rather than the material atlas.
from PIL import Image
map_png = out.parent / '_cordon_map_texture.png'
Image.open(root / 'assets/images/cordon-clean.webp').convert('RGB').save(map_png)
map_reader = vtk.vtkPNGReader(); map_reader.SetFileName(str(map_png)); map_reader.Update()
map_texture = vtk.vtkTexture(); map_texture.SetInputConnection(map_reader.GetOutputPort()); map_texture.InterpolateOn(); map_texture.RepeatOff(); map_texture.MipmapOn(); map_texture.EdgeClampOn()

def mesh_actor(mesh, position=(0, 0, 0), yaw=0, selected_texture=texture):
    verts = np.asarray(mesh['vertices'], dtype=np.float32).reshape(-1, 3)
    uv = np.asarray(mesh['uvs'], dtype=np.float32).reshape(-1, 2).copy(); uv[:, 1] = 1.0 - uv[:, 1]
    count = len(verts); ids = np.arange(count, dtype=np.int64).reshape(-1, 3)
    faces = np.empty((len(ids), 4), dtype=np.int64); faces[:, 0] = 3; faces[:, 1:] = ids
    pts = vtk.vtkPoints(); pts.SetData(numpy_to_vtk(verts, deep=True))
    cells = vtk.vtkCellArray(); cells.SetCells(len(ids), numpy_to_vtkIdTypeArray(faces.reshape(-1), deep=True))
    tc = numpy_to_vtk(uv, deep=True); tc.SetNumberOfComponents(2)
    poly = vtk.vtkPolyData(); poly.SetPoints(pts); poly.SetPolys(cells); poly.GetPointData().SetTCoords(tc)
    normals = vtk.vtkPolyDataNormals(); normals.SetInputData(poly); normals.ConsistencyOn(); normals.AutoOrientNormalsOn(); normals.SplittingOff(); normals.Update()
    mapper = vtk.vtkPolyDataMapper(); mapper.SetInputConnection(normals.GetOutputPort()); mapper.ScalarVisibilityOff()
    actor = vtk.vtkActor(); actor.SetMapper(mapper); actor.SetTexture(selected_texture); actor.SetPosition(*position); actor.RotateY(yaw * 180 / np.pi)
    prop = actor.GetProperty(); prop.SetInterpolationToPhong(); prop.SetAmbient(.27); prop.SetDiffuse(.90); prop.SetSpecular(.18); prop.SetSpecularPower(22)
    return actor

if mode == 'map':
    if scene.get('terrain'): ren.AddActor(mesh_actor(scene['terrain'], selected_texture=map_texture))
    cam = ren.GetActiveCamera(); cam.SetPosition(0, 150, 0); cam.SetFocalPoint(0, 0, 0); cam.SetViewUp(0, 0, -1); cam.SetViewAngle(48)
elif mode == 'character':
    # Three source-inspired faction outfits, displayed side-by-side at equal scale.
    for index, entry in enumerate(scene['npcs']):
        ren.AddActor(mesh_actor(entry['mesh'], ((index - 1) * 3.45, 0, 0), np.pi))
elif mode == 'gameplay':
    pos = scene['playerPosition']
    if scene.get('terrain'): ren.AddActor(mesh_actor(scene['terrain'], selected_texture=map_texture))
    if scene.get('props'): ren.AddActor(mesh_actor(scene['props']))
    else: ren.AddActor(mesh_actor(scene['world']))
    for entry in scene['npcs']:
        npcpos = entry['pos']; ren.AddActor(mesh_actor(entry['mesh'], (npcpos['x'], 0, npcpos['z']), 0.0))
    for entry in scene['loot']:
        lootpos = entry['pos']; ren.AddActor(mesh_actor(entry['mesh'], (lootpos['x'], .03, lootpos['z']), 0.0))
    ren.AddActor(mesh_actor(scene['player'], (pos['x'], 0, pos['z']), 0))
elif mode == 'first-person':
    pos = scene['playerPosition']; eye = (pos['x'], scene.get('cameraHeight', 1.66), pos['z'])
    if scene.get('terrain'): ren.AddActor(mesh_actor(scene['terrain'], selected_texture=map_texture))
    if scene.get('props'): ren.AddActor(mesh_actor(scene['props']))
    else: ren.AddActor(mesh_actor(scene['world']))
    for entry in scene['npcs']:
        npcpos = entry['pos']; ren.AddActor(mesh_actor(entry['mesh'], (npcpos['x'], 0, npcpos['z']), 0.0))
    for entry in scene['loot']:
        lootpos = entry['pos']; ren.AddActor(mesh_actor(entry['mesh'], (lootpos['x'], .03, lootpos['z']), 0.0))
    viewmodel = mesh_actor(scene['firstPerson'], (eye[0], eye[1] - .12, eye[2] - .35), 0); viewmodel.SetScale(.50, .50, .50); ren.AddActor(viewmodel)
else:
    if scene.get('terrain'): ren.AddActor(mesh_actor(scene['terrain'], selected_texture=map_texture))
    if scene.get('props'): ren.AddActor(mesh_actor(scene['props']))
    else: ren.AddActor(mesh_actor(scene['world']))
    for entry in scene['npcs']:
        pos = entry['pos']; ren.AddActor(mesh_actor(entry['mesh'], (pos['x'], 0, pos['z']), 0.0))
    for entry in scene['loot']:
        pos = entry['pos']; ren.AddActor(mesh_actor(entry['mesh'], (pos['x'], .03, pos['z']), 0.0))
    pos = scene['playerPosition']; ren.AddActor(mesh_actor(scene['player'], (pos['x'], 0, pos['z']), 0))

key = vtk.vtkLight(); key.SetLightTypeToSceneLight(); key.SetPosition(-18, 30, 18); key.SetFocalPoint(0, 0, 0); key.SetColor(1.0, .95, .82); key.SetIntensity(1.05); ren.AddLight(key)
fill = vtk.vtkLight(); fill.SetLightTypeToSceneLight(); fill.SetPosition(16, 12, -18); fill.SetFocalPoint(0, 1, 0); fill.SetColor(.76, .86, .73); fill.SetIntensity(.40); ren.AddLight(fill)
cam = ren.GetActiveCamera()
if mode == 'map':
    if scene.get('terrain'): ren.AddActor(mesh_actor(scene['terrain'], selected_texture=map_texture))
    cam = ren.GetActiveCamera(); cam.SetPosition(0, 150, 0); cam.SetFocalPoint(0, 0, 0); cam.SetViewUp(0, 0, -1); cam.SetViewAngle(48)
elif mode == 'map':
    pass
elif mode == 'character':
    cam.SetPosition(0, 3.4, 10.5); cam.SetFocalPoint(0, 1.12, 0); cam.SetViewUp(0, 1, 0); cam.SetViewAngle(42)
elif mode == 'gameplay':
    pos = scene['playerPosition']; cam.SetPosition(pos['x']+.85, 3.7, pos['z']+7.8); cam.SetFocalPoint(pos['x']+.20, 1.55, pos['z']-13); cam.SetViewUp(0, 1, 0); cam.SetViewAngle(58)
elif mode == 'first-person':
    pos=scene['playerPosition']; eye=(pos['x'],scene.get('cameraHeight',1.66),pos['z']); cam.SetPosition(*eye); cam.SetFocalPoint(eye[0],eye[1],eye[2]-10); cam.SetViewUp(0,1,0); cam.SetViewAngle(62)
else:
    cam.SetPosition(0, 12.0, 47); cam.SetFocalPoint(0, 1.6, 1); cam.SetViewUp(0, 1, 0); cam.SetViewAngle(54)
cam.SetClippingRange(.1, 180); ren.ResetCameraClippingRange(); ren.SetUseDepthPeeling(True); ren.SetMaximumNumberOfPeels(4); ren.SetOcclusionRatio(.1)
rw.Render()
shot = vtk.vtkWindowToImageFilter(); shot.SetInput(rw); shot.SetInputBufferTypeToRGB(); shot.ReadFrontBufferOff(); shot.Update()
out.parent.mkdir(parents=True, exist_ok=True)
writer = vtk.vtkPNGWriter(); writer.SetFileName(str(out)); writer.SetInputConnection(shot.GetOutputPort()); writer.Write()
print(f'{out} ({out.stat().st_size:,} bytes)')
