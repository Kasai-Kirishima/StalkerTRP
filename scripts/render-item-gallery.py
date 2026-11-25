#!/usr/bin/env python3
"""Render the catalog's procedural 3D item meshes as an offline QA gallery."""
from pathlib import Path
import json, sys, math
import numpy as np
import vtk
from vtk.util.numpy_support import numpy_to_vtk, numpy_to_vtkIdTypeArray
root=Path(__file__).resolve().parents[1]
scene=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
out=Path(sys.argv[2]) if len(sys.argv)>2 else root/'screenshots/07-item-model-gallery.png'
rw=vtk.vtkRenderWindow();rw.SetOffScreenRendering(1);rw.SetSize(1600,1200);rw.SetMultiSamples(4)
ren=vtk.vtkRenderer();rw.AddRenderer(ren);ren.SetBackground(.07,.09,.08);ren.SetBackground2(.19,.23,.18);ren.SetGradientBackground(True)
reader=vtk.vtkPNGReader();reader.SetFileName(str(root/'assets/textures/cordon-materials.png'));reader.Update()
texture=vtk.vtkTexture();texture.SetInputConnection(reader.GetOutputPort());texture.InterpolateOn();texture.RepeatOff();texture.MipmapOn();texture.EdgeClampOn()

def actor_for(mesh,pos,scale=1.15):
    v=np.asarray(mesh['vertices'],dtype=np.float32).reshape(-1,3);uv=np.asarray(mesh['uvs'],dtype=np.float32).reshape(-1,2).copy();uv[:,1]=1-uv[:,1]
    ids=np.arange(len(v),dtype=np.int64).reshape(-1,3);face=np.empty((len(ids),4),dtype=np.int64);face[:,0]=3;face[:,1:]=ids
    p=vtk.vtkPoints();p.SetData(numpy_to_vtk(v,deep=True));cells=vtk.vtkCellArray();cells.SetCells(len(ids),numpy_to_vtkIdTypeArray(face.reshape(-1),deep=True))
    tc=numpy_to_vtk(uv,deep=True);tc.SetNumberOfComponents(2);pd=vtk.vtkPolyData();pd.SetPoints(p);pd.SetPolys(cells);pd.GetPointData().SetTCoords(tc)
    nm=vtk.vtkPolyDataNormals();nm.SetInputData(pd);nm.ConsistencyOn();nm.AutoOrientNormalsOn();nm.SplittingOff();nm.Update()
    mp=vtk.vtkPolyDataMapper();mp.SetInputConnection(nm.GetOutputPort());mp.ScalarVisibilityOff()
    a=vtk.vtkActor();a.SetMapper(mp);a.SetTexture(texture);a.SetPosition(*pos);a.SetScale(scale);a.GetProperty().SetAmbient(.35);a.GetProperty().SetDiffuse(.85);a.GetProperty().SetSpecular(.15);return a
cols=4;dx=4.5;dz=4.35;start_x=-(cols-1)*dx/2
for i,item in enumerate(scene):
    row=i//cols;col=i%cols;x=start_x+col*dx;z=-(row*dz)
    verts=np.asarray(item['mesh']['vertices'],dtype=np.float32).reshape(-1,3);lo=verts.min(axis=0);hi=verts.max(axis=0);extent=np.maximum(hi-lo,.001);scale=2.05/float(max(extent))
    ren.AddActor(actor_for(item['mesh'],(x,.06-lo[1]*scale,z),scale))
    label=vtk.vtkBillboardTextActor3D();label.SetInput(item['id']);label.SetPosition(x,2.36,z-1.02);label.GetTextProperty().SetFontSize(16);label.GetTextProperty().SetColor(.84,.88,.73);label.GetTextProperty().SetJustificationToCentered();label.GetTextProperty().SetBackgroundOpacity(0.0);ren.AddActor(label)
key=vtk.vtkLight();key.SetLightTypeToSceneLight();key.SetPosition(-10,28,18);key.SetFocalPoint(0,0,0);key.SetIntensity(1.1);ren.AddLight(key)
cam=ren.GetActiveCamera();cam.SetPosition(0,22,17);cam.SetFocalPoint(0,0,-4.35);cam.SetViewUp(0,1,0);cam.SetParallelProjection(True);cam.SetParallelScale(6.6);cam.SetClippingRange(.1,160)
ren.ResetCameraClippingRange();rw.Render();shot=vtk.vtkWindowToImageFilter();shot.SetInput(rw);shot.SetInputBufferTypeToRGB();shot.ReadFrontBufferOff();shot.Update();out.parent.mkdir(parents=True,exist_ok=True);wr=vtk.vtkPNGWriter();wr.SetFileName(str(out));wr.SetInputConnection(shot.GetOutputPort());wr.Write();print(f'{out} ({out.stat().st_size:,} bytes)')
