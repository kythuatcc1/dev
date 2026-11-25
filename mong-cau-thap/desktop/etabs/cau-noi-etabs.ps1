<#
  Cầu nối app Móng cẩu tháp <-> ETABS (v22, v23) qua thư viện API ETABSv1.dll của ETABS.

  App (MongCauThap.exe) gọi:
    powershell -NoProfile -ExecutionPolicy Bypass -File cau-noi-etabs.ps1 -YeuCau <vao.json> -KetQua <ra.json>
  Chạy thử bằng tay (in kết quả ra màn hình):
    powershell -NoProfile -ExecutionPolicy Bypass -File cau-noi-etabs.ps1 -Lenh kiem-tra
    powershell -NoProfile -ExecutionPolicy Bypass -File cau-noi-etabs.ps1 -Lenh kiem-tra -DuongDanEtabs "C:\Program Files\Computers and Structures\ETABS 23"

  Yêu cầu (JSON): { "lenh": "kiem-tra", "duongDanEtabs": "" }
  Kết quả (JSON): { "ok": true|false, "lenh": "...", "buoc": [ { "ten", "ok", "chiTiet" } ], "thongTin": { ... }, "loi": "..." }

  Cách gọi API: nạp ETABSv1.dll của chính bản ETABS đang cài rồi gọi hàm qua reflection,
  nên không cần biên dịch trước và dùng được cho v22, v23 (ETABSv1.dll nhắm .NET Standard 2.0).
  Thông báo trong file này để không dấu (ASCII) để hiển thị đúng trên mọi cửa sổ lệnh.
#>
param(
  [string]$YeuCau = '',
  [string]$KetQua = '',
  [string]$Lenh = 'kiem-tra',
  [string]$DuongDanEtabs = ''
)

$ErrorActionPreference = 'Stop'
$UTF8 = New-Object System.Text.UTF8Encoding $false

$buoc = New-Object System.Collections.ArrayList
$thongTin = [ordered]@{}
$kq = [ordered]@{ ok = $false; lenh = $Lenh; buoc = $buoc; thongTin = $thongTin; loi = $null; buocLoi = $null; goiY = $null }

function Ghi-Buoc([string]$ten, [bool]$ok, [string]$chiTiet) {
  [void]$buoc.Add([ordered]@{ ten = $ten; ok = $ok; chiTiet = $chiTiet })
}

function Xuat-KetQua {
  $json = $kq | ConvertTo-Json -Depth 8 -Compress
  if ($KetQua) {
    [System.IO.File]::WriteAllText($KetQua, $json, $UTF8)
  } else {
    foreach ($b in $buoc) {
      $dau = '[LOI]'
      if ($b.ok) { $dau = '[OK] ' }
      Write-Host ($dau + ' ' + $b.ten + ': ' + $b.chiTiet)
    }
    foreach ($t in $thuHam) {
      if ($t.ok) { Write-Host ('  [OK]  ' + $t.ten + ' = ' + $t.ketQua) } else { Write-Host ('  [LOI] ' + $t.ten + ': ' + $t.loi + ' ' + $t.hresult) }
    }
    foreach ($k in $thongTin.Keys) { Write-Host ('  ' + $k + ' = ' + ($thongTin[$k] -join ', ')) }
    if ($kq.ok) { Write-Host 'KET QUA: KET NOI THANH CONG' } else { Write-Host ('KET QUA: LOI - ' + $kq.loi) }
  }
}

# Gọi hàm/thuộc tính của giao diện ETABSv1 qua reflection (tham số ref được cập nhật lại vào mảng)
$maCSharp = @'
using System;
using System.Reflection;
public static class MctEtabs {
  static object Goc(object x) {
    if (x == null) return null;
    Type t = x.GetType();
    if (t.FullName == "System.Management.Automation.PSObject") {
      PropertyInfo p = t.GetProperty("BaseObject");
      if (p != null) return p.GetValue(x, null);
    }
    return x;
  }
  public static object Lay(object o, Type t, string ten) {
    PropertyInfo p = t.GetProperty(ten);
    if (p == null) throw new Exception("Khong tim thay thuoc tinh " + t.Name + "." + ten);
    try { return p.GetValue(Goc(o), null); }
    catch (TargetInvocationException ex) { throw ex.InnerException ?? ex; }
  }
  static MethodInfo Tim(Type t, string ten, int soThamSo) {
    MethodInfo du = null;
    foreach (MethodInfo m in t.GetMethods()) {
      if (m.Name != ten) continue;
      int n = m.GetParameters().Length;
      if (n == soThamSo) return m;
      if (n > soThamSo && du == null) du = m;
    }
    if (du == null) throw new Exception("Khong tim thay ham " + t.Name + "." + ten + " voi " + soThamSo + " tham so");
    return du;
  }
  public static object Goi(object o, Type t, string ten, object[] a) {
    if (a == null) a = new object[0];
    for (int i = 0; i < a.Length; i++) a[i] = Goc(a[i]);
    MethodInfo m = Tim(t, ten, a.Length);
    ParameterInfo[] ps = m.GetParameters();
    object[] b = a;
    if (ps.Length > a.Length) {
      b = new object[ps.Length];
      for (int i = 0; i < ps.Length; i++) {
        if (i < a.Length) { b[i] = a[i]; continue; }
        if (!ps[i].IsOptional) throw new Exception("Thieu tham so " + ps[i].Name + " cua ham " + t.Name + "." + ten);
        object dv = ps[i].DefaultValue;
        b[i] = (dv is DBNull) ? Type.Missing : dv;
      }
    }
    try {
      object r = m.Invoke(Goc(o), b);
      if (!object.ReferenceEquals(a, b)) Array.Copy(b, a, a.Length);
      return r;
    } catch (TargetInvocationException ex) {
      throw ex.InnerException ?? ex;
    }
  }
}
'@

function Tim-Dll([string]$goiY, $tienTrinh) {
  $ung = New-Object System.Collections.ArrayList
  if ($goiY) { [void]$ung.Add($goiY) }
  if ($null -ne $tienTrinh) {
    try { if ($tienTrinh.Path) { [void]$ung.Add((Split-Path -Parent $tienTrinh.Path)) } } catch { }
  }
  foreach ($goc in @($env:ProgramW6432, $env:ProgramFiles, 'C:\Program Files')) {
    if (-not $goc) { continue }
    $csi = Join-Path $goc 'Computers and Structures'
    if (Test-Path -LiteralPath $csi) {
      Get-ChildItem -LiteralPath $csi -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like 'ETABS*' } | Sort-Object Name -Descending |
        ForEach-Object { [void]$ung.Add($_.FullName) }
    }
  }
  foreach ($d in $ung) {
    $f = [string]$d
    if ($f -notlike '*.dll') { $f = Join-Path $f 'ETABSv1.dll' }
    if (Test-Path -LiteralPath $f) { return $f }
  }
  return $null
}

# Thử một lệnh API: ghi kết quả hoặc lỗi (loại lỗi, thông báo, HRESULT) vào bảng thuHam, trả về giá trị hoặc $null
$thuHam = New-Object System.Collections.ArrayList
$kq.thuHam = $thuHam
function Thu([string]$ten, [scriptblock]$viec) {
  try {
    $gt = & $viec
    $hien = ''
    if ($null -ne $gt) { $hien = [string]$gt }
    [void]$thuHam.Add([ordered]@{ ten = $ten; ok = $true; ketQua = $hien })
    return $gt
  } catch {
    $ex = $_.Exception
    while ($null -ne $ex.InnerException -and ($ex -is [System.Management.Automation.MethodInvocationException] -or
           $ex -is [System.Reflection.TargetInvocationException] -or $ex -is [System.Management.Automation.RuntimeException])) {
      $ex = $ex.InnerException
    }
    [void]$thuHam.Add([ordered]@{ ten = $ten; ok = $false; loi = ($ex.GetType().FullName + ': ' + $ex.Message); hresult = ('0x{0:X8}' -f $ex.HResult) })
    return $null
  }
}

$giaiDoan = 'doc-yeu-cau'
try {
  # 0. Yêu cầu
  if ($YeuCau) {
    $vao = [System.IO.File]::ReadAllText($YeuCau, $UTF8) | ConvertFrom-Json
    if ($vao.lenh) { $Lenh = [string]$vao.lenh; $kq.lenh = $Lenh }
    if ($vao.duongDanEtabs) { $DuongDanEtabs = [string]$vao.duongDanEtabs }
  }
  $thongTin.powershell = $PSVersionTable.PSVersion.ToString()
  $thongTin.clr = [System.Environment]::Version.ToString()
  $thongTin.may64bit = [System.Environment]::Is64BitProcess
  if ($Lenh -ne 'kiem-tra') { throw ('Lenh chua ho tro: ' + $Lenh) }

  # 1. Tiến trình ETABS đang chạy
  $giaiDoan = 'tim-etabs'
  $tt = @(Get-Process -Name 'ETABS' -ErrorAction SilentlyContinue)
  if ($tt.Count -eq 0) {
    Ghi-Buoc 'tim-etabs' $false 'ETABS chua mo. Hay mo ETABS (mo mo hinh bat ky hoac New Model) roi thu lai.'
    throw 'ETABS chua mo'
  }
  $thongTin.soPhienEtabs = $tt.Count
  Ghi-Buoc 'tim-etabs' $true ('Dang chay ' + $tt.Count + ' phien ETABS (PID ' + (($tt | ForEach-Object { $_.Id }) -join ', ') + ')')

  # 2. Thư viện API
  $giaiDoan = 'tim-dll'
  $dll = Tim-Dll $DuongDanEtabs $tt[0]
  if (-not $dll) {
    Ghi-Buoc 'tim-dll' $false 'Khong tim thay ETABSv1.dll. Nhap thu muc cai ETABS (vi du C:\Program Files\Computers and Structures\ETABS 23).'
    throw 'Khong tim thay ETABSv1.dll'
  }
  $thongTin.dll = $dll
  $thongTin.dllPhienBan = (Get-Item -LiteralPath $dll).VersionInfo.FileVersion
  Ghi-Buoc 'tim-dll' $true $dll

  $giaiDoan = 'nap-dll'
  $asm = [System.Reflection.Assembly]::LoadFrom($dll)
  Add-Type -TypeDefinition $maCSharp -Language CSharp
  $T = @{}
  foreach ($ten in @('cHelper', 'Helper', 'cOAPI', 'cSapModel', 'cLoadPatterns', 'cPointObj', 'cFrameObj', 'cAreaObj')) {
    $T[$ten] = $asm.GetType('ETABSv1.' + $ten, $true)
  }
  Ghi-Buoc 'nap-dll' $true ($asm.GetName().Name + ' ' + $asm.GetName().Version + ', ' + $asm.ImageRuntimeVersion)

  # 3. Gắn vào phiên ETABS đang mở
  $giaiDoan = 'ket-noi'
  $helper = [System.Activator]::CreateInstance($T['Helper'])
  $etabs = $null
  $cacLoi = @()
  try {
    $etabs = [MctEtabs]::Goi($helper, $T['cHelper'], 'GetObject', [object[]]@('CSI.ETABS.API.ETABSObject'))
    if ($null -ne $etabs) { $thongTin.cachKetNoi = 'Helper.GetObject' }
  } catch { $cacLoi += ('Helper.GetObject: ' + $_.Exception.Message) }
  if ($null -eq $etabs) {
    try {
      $etabs = [System.Runtime.InteropServices.Marshal]::GetActiveObject('CSI.ETABS.API.ETABSObject')
      if ($null -ne $etabs) { $thongTin.cachKetNoi = 'Marshal.GetActiveObject' }
    } catch { $cacLoi += ('Marshal.GetActiveObject: ' + $_.Exception.Message) }
  }
  if ($null -eq $etabs) {
    foreach ($p in $tt) {
      try {
        $etabs = [MctEtabs]::Goi($helper, $T['cHelper'], 'GetObjectProcess', [object[]]@('CSI.ETABS.API.ETABSObject', [int]$p.Id))
        if ($null -ne $etabs) { $thongTin.cachKetNoi = 'Helper.GetObjectProcess(' + $p.Id + ')'; break }
      } catch { $cacLoi += ('Helper.GetObjectProcess(' + $p.Id + '): ' + $_.Exception.Message) }
    }
  }
  if ($null -eq $etabs) {
    # Ghi lại các hàm của cHelper trong bản ETABS này để điều chỉnh cách gắn nếu cần
    $thongTin.hamHelper = @($T['cHelper'].GetMethods() | ForEach-Object { $_.Name } | Sort-Object -Unique)
    Ghi-Buoc 'ket-noi' $false ('Khong gan duoc vao ETABS. ' + ($cacLoi -join ' | '))
    throw 'Khong gan duoc vao ETABS'
  }
  Ghi-Buoc 'ket-noi' $true $thongTin.cachKetNoi

  # 4. Đọc thông tin mô hình: thử từng hàm riêng, ghi lỗi chi tiết của từng hàm
  $giaiDoan = 'doc-mo-hinh'
  $thongTin.kieuEtabs = $etabs.GetType().FullName
  $thongTin.etabsLaCom = [System.Runtime.InteropServices.Marshal]::IsComObject($etabs)
  $thongTin.apiPhienBan = Thu 'cOAPI.GetOAPIVersionNumber' { [MctEtabs]::Goi($etabs, $T['cOAPI'], 'GetOAPIVersionNumber', [object[]]@()) }
  $sap = Thu 'cOAPI.SapModel' { [MctEtabs]::Lay($etabs, $T['cOAPI'], 'SapModel') }
  if ($null -eq $sap) { throw 'Khong lay duoc SapModel' }
  $thongTin.kieuSapModel = $sap.GetType().FullName
  $thongTin.fileMoHinh = Thu 'SapModel.GetModelFilename' { [MctEtabs]::Goi($sap, $T['cSapModel'], 'GetModelFilename', [object[]]@($true)) }
  $thongTin.donVi = Thu 'SapModel.GetPresentUnits' { [string][MctEtabs]::Goi($sap, $T['cSapModel'], 'GetPresentUnits', [object[]]@()) }
  $thongTin.moHinhKhoa = Thu 'SapModel.GetModelIsLocked' { [MctEtabs]::Goi($sap, $T['cSapModel'], 'GetModelIsLocked', [object[]]@()) }
  $thongTin.etabsPhienBan = Thu 'SapModel.GetVersion' {
    $a = [object[]]@('', [double]0)
    $r = [MctEtabs]::Goi($sap, $T['cSapModel'], 'GetVersion', $a)
    [string]$a[0] + ' (' + [string]$a[1] + ', ret ' + [string]$r + ')'
  }
  if ($null -eq $thongTin.etabsPhienBan) {
    # Cách gọi thứ hai: để PowerShell tự gọi qua COM (IDispatch)
    $thongTin.etabsPhienBan = Thu 'SapModel.GetVersion (COM)' {
      $v = ''; $n = [double]0
      $r = $sap.GetVersion([ref]$v, [ref]$n)
      $v + ' (' + [string]$n + ', ret ' + [string]$r + ')'
    }
  }
  $dem = [ordered]@{ soDiem = @('PointObj', 'cPointObj'); soThanh = @('FrameObj', 'cFrameObj'); soVung = @('AreaObj', 'cAreaObj') }
  # (biến vòng lặp đặt tên khác tham số $ten của hàm Thu để khối lệnh đọc đúng giá trị)
  foreach ($k in @($dem.Keys)) {
    $doiTuongDem = $dem[$k][0]; $kieuDem = $dem[$k][1]
    $thongTin[$k] = Thu ($doiTuongDem + '.Count') { [MctEtabs]::Goi([MctEtabs]::Lay($sap, $T['cSapModel'], $doiTuongDem), $T[$kieuDem], 'Count', [object[]]@()) }
  }
  $thongTin.loadPatterns = Thu 'LoadPatterns.GetNameList' {
    $lp = [MctEtabs]::Lay($sap, $T['cSapModel'], 'LoadPatterns')
    $a = [object[]]@([int]0, $null)
    [void][MctEtabs]::Goi($lp, $T['cLoadPatterns'], 'GetNameList', $a)
    if ($null -ne $a[1]) { ($a[1] | ForEach-Object { [string]$_ }) -join ', ' } else { '' }
  }

  $docDuoc = @($thuHam | Where-Object { $_.ok -and $_.ten -like 'SapModel.*' }).Count
  $nreSap = @($thuHam | Where-Object { (-not $_.ok) -and $_.ten -like 'SapModel.*' -and $_.loi -like 'System.NullReferenceException*' }).Count
  if ($docDuoc -eq 0) {
    if ($nreSap -gt 0) { $kq.goiY = 'mo-mo-hinh' }
    Ghi-Buoc 'doc-mo-hinh' $false 'Khong doc duoc mo hinh (xem bang thu tung ham). Neu ETABS dang o man hinh khoi dong: File > New Model hoac mo file .EDB roi thu lai.'
    throw 'Khong doc duoc mo hinh dang mo'
  }
  Ghi-Buoc 'doc-mo-hinh' $true ('Doc duoc ' + $docDuoc + ' ham SapModel; mo hinh: ' + $thongTin.fileMoHinh)

  $kq.ok = $true
} catch {
  $kq.ok = $false
  $kq.buocLoi = $giaiDoan
  $kq.loi = $_.Exception.Message
  $daGhi = $false
  foreach ($b in $buoc) { if ($b.ten -eq $giaiDoan) { $daGhi = $true } }
  if (-not $daGhi) { Ghi-Buoc $giaiDoan $false $_.Exception.Message }
}
Xuat-KetQua
