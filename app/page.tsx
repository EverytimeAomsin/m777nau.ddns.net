"use client";

import { useState, useEffect } from "react";
import { ballisticData, calculateBallistics } from "@/logic/calculations";

// Cookie helper functions
const setCookie = (name: string, value: string, hours: number) => {
  const date = new Date();
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export default function Home() {
  const [batX, setBatX] = useState("");
  const [batY, setBatY] = useState("");
  const [tgtX, setTgtX] = useState("");
  const [tgtY, setTgtY] = useState("");
  const [corrRange, setCorrRange] = useState(0);
  const [corrLat, setCorrLat] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const [panX, setPanX] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 }); // Percentage position

  const result = calculateBallistics(batX, batY, tgtX, tgtY, corrRange, corrLat);

  // คำนวณอัตโนมัติ: ถ้า Target อยู่ใต้ Battery (tgtY < batY) = ยิงไปทิศใต้
  const parseGrid = (val: string): number | null => {
    if (!val) return null;
    let num = parseInt(val, 10);
    if (isNaN(num)) return null;
    if (val.length === 3) num *= 100;
    if (val.length === 4) num *= 10;
    return num;
  };

  const batYNum = parseGrid(batY);
  const tgtYNum = parseGrid(tgtY);
  const isSouthDirection = batYNum !== null && tgtYNum !== null && tgtYNum < batYNum;

  // หา 2 แถวที่ใกล้เคียง Elevation มากที่สุด
  const getHighlightedRows = () => {
    const elevNum = parseInt(result.elev);
    if (isNaN(elevNum) || result.elev === "----" || result.elev === "MIN RNG" || result.elev === "MAX RNG") {
      return [];
    }

    // หาแถวที่ใกล้เคียงที่สุด 2 แถว
    const sorted = [...ballisticData]
      .map((row, index) => ({ ...row, index, diff: Math.abs(row.elev - elevNum) }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 2);

    return sorted.map(item => item.index);
  };

  const highlightedRows = getHighlightedRows();

  const adjust = (field: "corrRange" | "corrLat", val: number) => {
    if (field === "corrRange") {
      setCorrRange((prev) => prev + val);
    } else {
      setCorrLat((prev) => prev + val);
    }
  };

  const resetCorrections = () => {
    setCorrRange(0);
    setCorrLat(0);
  };

  // โหลดค่า Battery Position จากคุกกี้เมื่อ component mount
  useEffect(() => {
    const savedBatX = getCookie("batteryX");
    const savedBatY = getCookie("batteryY");
    if (savedBatX) setBatX(savedBatX);
    if (savedBatY) setBatY(savedBatY);
  }, []);

  // บันทึกค่า Battery Position ลงคุกกี้เมื่อค่าเปลี่ยน (หมดอายุ 80 ชั่วโมง)
  useEffect(() => {
    if (batX) {
      setCookie("batteryX", batX, 80);
    }
  }, [batX]);

  useEffect(() => {
    if (batY) {
      setCookie("batteryY", batY, 80);
    }
  }, [batY]);

  // เมื่อ Battery Position หรือ Target Position เปลี่ยน ให้ reset corrections และเปิด table
  useEffect(() => {
    if (batX && batY && tgtX && tgtY) {
      setCorrRange(0);
      setCorrLat(0);
      setShowTable(true);
    }
  }, [batX, batY, tgtX, tgtY]);

  return (
    <main className="min-h-screen p-4 flex flex-col items-center relative">
      <div className="scanlines"></div>

      <div className="max-w-2xl w-full z-10 pb-12">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg mb-6">
          
          <div className="flex justify-between items-center mb-2">
            <div className="section-header border-none m-0">
              <div>
                <ul>
                  <li className="mb-3">
                  1.เข้าเว็บ{" "}
                    <a
                      href="https://arma-mortar.com/?map=gogland&l=satellite"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      https://arma-mortar.com
                    </a>
                  </li>
                  <li className="mb-3">
                    2.คัดลอกพิกัด <b>X</b> และ <b>Y</b> จากแผนที่มากรอกในเว็บนี้
                    <br />
                    ตัวอย่าง: X = 5510, Y = 6763 ให้กรอกเป็น <b>05510</b> และ <b>06763</b>
                  </li>
                  <li className="mb-3">
                    3.กรอกทั้งพิกัด <b>เป้าหมาย</b> และ <b>ตำแหน่งปืนใหญ่</b>
                  </li>
                  <li className="mb-3">
                    4.ระบบจะคำนวณ <b>ทิศทาง</b> และ <b>มุมเงย</b> ของปืนให้โดยอัตโนมัติ
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        {/* Header */}
        <header className="mb-6 text-center border-b-2 border-green-800 pb-4">
          <h1 className="text-3xl font-bold text-green-500 tracking-wider">
            M107 FDC COMPUTER
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            FIELD ARTILLERY BALLISTIC DATA SYSTEM
          </p>
        </header>

        {/* Main Calculator Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Battery Position Input */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            <h2 className="section-header">1. ที่ตั้งปืนใหญ่ (Battery Position)</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">EASTING (X)</label>
                <input
                  type="number"
                  placeholder="00000"
                  className="input-dark w-full p-2 rounded text-lg font-bold"
                  value={batX}
                  onChange={(e) => setBatX(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">NORTHING (Y)</label>
                <input
                  type="number"
                  placeholder="00000"
                  className="input-dark w-full p-2 rounded text-lg font-bold"
                  value={batY}
                  onChange={(e) => setBatY(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Target Position Input */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            <h2 className="section-header">2. ตำบลกระสุนตก (Target)</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">EASTING (X)</label>
                <input
                  type="number"
                  placeholder="00000"
                  className="input-dark w-full p-2 rounded text-lg font-bold"
                  value={tgtX}
                  onChange={(e) => setTgtX(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">NORTHING (Y)</label>
                <input
                  type="number"
                  placeholder="00000"
                  className="input-dark w-full p-2 rounded text-lg font-bold"
                  value={tgtY}
                  onChange={(e) => setTgtY(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

      

        {/* Visual Range Graphic */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg mb-6">
        
          <div className="flex justify-between items-center mb-2">
            <h2 className="section-header border-none m-0">
              3. ปรับเทียบระยะปืนใหญ่ (เมตร)
            </h2>
            <button
              onClick={resetCorrections}
              className="text-xs text-red-400 hover:text-red-300 uppercase font-bold"
            >
              [Reset Corrections]
            </button>
          </div>
          <div className="flex gap-4 items-stretch">
            {/* Range Control (ด้านซ้าย - แนวตั้ง) */}
            <div className="flex flex-col items-center justify-center gap-2 min-w-[90px] bg-gray-900/50 p-3 rounded border border-gray-700">
              {/* บน: ADD (Further) */}
              <div className="text-xs text-gray-500 text-center mb-1">
                <div>ADD</div>
                <div className="text-[10px]">(Further)</div>
              </div>
              
              {/* ปุ่มเพิ่ม - บน */}
              <div className="flex flex-col gap-1">
                <button
                  className="btn-adj w-12 h-8 text-xs"
                  onClick={() => adjust("corrRange", isSouthDirection ? -50 : 50)}
                >
                  {isSouthDirection ? "-50" : "+50"}
                </button>
                <button
                  className="btn-adj w-12 h-8 text-xs"
                  onClick={() => adjust("corrRange", isSouthDirection ? -20 : 20)}
                >
                  {isSouthDirection ? "-20" : "+20"}
                </button>
                <button
                  className="btn-adj w-12 h-8 text-xs"
                  onClick={() => adjust("corrRange", isSouthDirection ? -10 : 10)}
                >
                  {isSouthDirection ? "-10" : "+10"}
                </button>
              </div>

              {/* กลาง: ค่า */}
              <input
                type="number"
                value={corrRange}
                className="input-dark w-16 text-center font-bold p-2 rounded text-lg"
                onChange={(e) => setCorrRange(parseInt(e.target.value) || 0)}
              />

              {/* ปุ่มลด - ล่าง */}
              <div className="flex flex-col gap-1">
                <button
                  className="btn-adj w-12 h-8 text-xs"
                  onClick={() => adjust("corrRange", isSouthDirection ? 10 : -10)}
                >
                  {isSouthDirection ? "+10" : "-10"}
                </button>
                <button
                  className="btn-adj w-12 h-8 text-xs"
                  onClick={() => adjust("corrRange", isSouthDirection ? 20 : -20)}
                >
                  {isSouthDirection ? "+20" : "-20"}
                </button>
                <button
                  className="btn-adj w-12 h-8 text-xs"
                  onClick={() => adjust("corrRange", isSouthDirection ? 50 : -50)}
                >
                  {isSouthDirection ? "+50" : "-50"}
                </button>
              </div>

              {/* ล่าง: DROP (Closer) */}
              <div className="text-xs text-gray-500 text-center mt-1">
                <div>DROP</div>
                <div className="text-[10px]">(Closer)</div>
              </div>
            </div>

            {/* กราฟิก */}
            <div className="relative flex-1 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
            <div
              className="w-full h-full relative"
              style={{
                transform: `scale(${zoom}) translate(${panX}px, 0px)`,
                transition: 'transform 0.1s ease-out',
              }}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setZoom((prev) => Math.max(0.5, Math.min(3, prev + delta)));
              }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                const target = e.target as HTMLElement;
                if (target.closest('.draggable-target')) return; // Don't pan if clicking on target
                
                const startX = e.clientX;
                const startPanX = panX;
                
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const deltaX = (moveEvent.clientX - startX) / zoom;
                  setPanX(startPanX + deltaX);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              {/* Grid Background */}
              <svg className="absolute inset-0 w-full h-full opacity-20">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4ade80" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* ทิศเหนือ - มุมขวาบน */}
              <div className="absolute top-2 right-2 pointer-events-none z-10">
                <div className="flex flex-col items-center text-green-400">
                  <div className="text-xs font-bold mb-1">N</div>
                  <svg width="20" height="20" viewBox="0 0 20 20" className="text-green-400">
                    <path d="M 10 2 L 10 18 M 10 2 L 6 8 M 10 2 L 14 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Center Crosshair */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-8 h-8 border border-gray-600 opacity-30">
                  <div className="absolute top-1/2 left-0 w-full h-px bg-gray-600"></div>
                  <div className="absolute left-1/2 top-0 w-px h-full bg-gray-600"></div>
                </div>
              </div>

              {/* Original Target Position (จุดตกหลัก) */}
              <div
                className="draggable-target absolute cursor-grab active:cursor-grabbing"
                style={{
                  left: `${targetPos.x}%`,
                  top: `${targetPos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startPosX = targetPos.x;
                  const startPosY = targetPos.y;
                  const container = e.currentTarget.parentElement;
                  if (!container) return;
                  
                  const containerRect = container.getBoundingClientRect();
                  
                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const deltaX = ((moveEvent.clientX - startX) / containerRect.width) * 100;
                    const deltaY = ((moveEvent.clientY - startY) / containerRect.height) * 100;
                    
                    setTargetPos({
                      x: Math.max(0, Math.min(100, startPosX + deltaX)),
                      y: Math.max(0, Math.min(100, startPosY + deltaY)),
                    });
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              >
                <div className="relative">
                  <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-red-300 shadow-lg shadow-red-500/50"></div>
                  <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs text-red-400 font-bold whitespace-nowrap">
                    จุดตก (TARGET)
                  </div>
                  <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 text-[10px] text-gray-400 font-mono whitespace-nowrap">
                    {tgtX && tgtY ? `X: ${tgtX} | Y: ${tgtY}` : 'X: --- | Y: ---'}
                  </div>
                </div>
              </div>

              {/* Adjusted Target Position (จุดที่เลื่อนตามการแก้ไข) */}
              {(corrRange !== 0 || corrLat !== 0) && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${Math.max(0, Math.min(100, targetPos.x + (corrLat * 0.5)))}%`,
                    top: `${Math.max(0, Math.min(100, targetPos.y + (corrRange * 0.5 * (isSouthDirection ? 1 : -1))))}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="relative">
                    <div className="w-5 h-5 bg-yellow-500 rounded-full border-2 border-yellow-300 shadow-lg shadow-yellow-500/50 animate-pulse"></div>
                    <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs text-yellow-400 font-bold whitespace-nowrap">
                      ADJUSTED
                    </div>
                    <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 text-[10px] text-yellow-400 font-mono whitespace-nowrap">
                      ระยะ: {corrRange > 0 ? '+' : ''}{corrRange}m | ซ้ายขวา: {corrLat > 0 ? '+' : ''}{corrLat}m
                    </div>
                  </div>
                </div>
              )}

              {/* Line connecting original and adjusted target */}
              {(corrRange !== 0 || corrLat !== 0) && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <line
                    x1={`${targetPos.x}%`}
                    y1={`${targetPos.y}%`}
                    x2={`${Math.max(0, Math.min(100, targetPos.x + (corrLat * 0.5)))}%`}
                    y2={`${Math.max(0, Math.min(100, targetPos.y + (corrRange * 0.5 * (isSouthDirection ? 1 : -1))))}%`}
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity="0.6"
                  />
                </svg>
              )}
            </div>
            </div>
          </div>

          {/* Left/Right Control (ด้านล่าง) */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1 w-full">
              <span>LEFT</span>
              <span>RIGHT</span>
            </div>
            <div className="flex gap-2 items-center w-full">
              {/* ปุ่ม L อยู่ซ้าย */}
              <div className="flex gap-1 flex-1 justify-end">
                <button
                  className="btn-adj flex-1"
                  onClick={() => adjust("corrLat", -50)}
                >
                  L 50
                </button>
                <button
                  className="btn-adj flex-1"
                  onClick={() => adjust("corrLat", -20)}
                >
                  L 20
                </button>
                <button
                  className="btn-adj flex-1"
                  onClick={() => adjust("corrLat", -10)}
                >
                  L 10
                </button>
              </div>
              
              {/* Input อยู่ตรงกลาง */}
              <input
                type="number"
                value={corrLat}
                className="input-dark w-20 text-center font-bold p-1 rounded"
                onChange={(e) => setCorrLat(parseInt(e.target.value) || 0)}
              />
              
              {/* ปุ่ม R อยู่ขวา */}
              <div className="flex gap-1 flex-1 justify-start">
                <button
                  className="btn-adj flex-1"
                  onClick={() => adjust("corrLat", 10)}
                >
                  R 10
                </button>
                <button
                  className="btn-adj flex-1"
                  onClick={() => adjust("corrLat", 20)}
                >
                  R 20
                </button>
                <button
                  className="btn-adj flex-1"
                  onClick={() => adjust("corrLat", 50)}
                >
                  R 50
                </button>
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          {/* <div className="mt-2 text-center text-xs text-gray-500">
            <div className="flex justify-center gap-4 flex-wrap">
              <span>🖱️ ลากจุดตก: เลื่อนซ้าย/ขวา/บน/ล่าง</span>
              <span>•</span>
              <span>🖱️ Scroll: ซูมเข้า/ออก ({Math.round(zoom * 100)}%)</span>
              <span>•</span>
              <button
                onClick={() => {
                  setPanX(0);
                  setZoom(1);
                  setTargetPos({ x: 50, y: 50 });
                }}
                className="text-green-400 hover:text-green-300 underline"
              >
                Reset View
              </button>
            </div>
          </div> */}
        </div>

        {/* Firing Solution Display */}
        <div className="lcd-bg p-6 rounded-xl mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-30 text-green-900 font-bold text-6xl pointer-events-none select-none">
            FDC
          </div>

          <div className="grid grid-cols-2 gap-8 text-center relative z-10">
            {/* Azimuth */}
            <div>
              <div className="text-xs text-green-700 font-bold mb-1 uppercase">
                Azimuth (Bearing)
              </div>
              <div className="text-4xl font-bold lcd-text">{result.azimuth}</div>
              <div className="text-sm text-green-800 font-bold mt-1">
                {result.degrees}
              </div>
            </div>

            {/* Elevation */}
            <div>
              <div className="text-xs text-green-700 font-bold mb-1 uppercase">
                Elevation (Mils)
              </div>
              <div
                className="text-5xl font-bold lcd-text"
                style={{
                  textShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
                  color: "#ef4444",
                }}
              >
                {result.elev}
              </div>
            </div>

            {/* Range */}
            <div>
              <div className="text-xs text-green-700 font-bold mb-1 uppercase">
                Final Range
              </div>
              <div className="text-2xl font-bold lcd-text">{result.range}</div>
            </div>

            {/* TOF */}
            <div>
              <div className="text-xs text-green-700 font-bold mb-1 uppercase">
                Time of Flight
              </div>
              <div className="text-2xl font-bold lcd-text">{result.tof}</div>
            </div>
          </div>

          {/* Error Message Area */}
          <div
            className={`text-center mt-4 text-sm font-bold h-6 ${result.statusClass}`}
          >
            {result.status}
          </div>
        </div>

        {/* Reference Table Toggle */}
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
          <button
            onClick={() => setShowTable(!showTable)}
            className="w-full p-3 bg-gray-800 text-left text-xs font-bold text-gray-400 hover:bg-gray-700 flex justify-between"
          >
            <span>VIEW RAW BALLISTIC TABLE</span>
            <span>{showTable ? "▲" : "▼"}</span>
          </button>
          {showTable && (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-xs text-right font-mono">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-700">
                    <th className="pb-2">RANGE</th>
                    <th className="pb-2 text-green-500">ELEV (MIL)</th>
                    <th className="pb-2">TOF (SEC)</th>
                  </tr>
                </thead>
                <tbody className="text-gray-400">
                  {ballisticData.map((row, index) => {
                    const isHighlighted = highlightedRows.includes(index);
                    return (
                      <tr 
                        key={row.r}
                        className={isHighlighted ? "bg-yellow-500/20" : ""}
                      >
                        <td className={`py-1 pr-4 border-b border-gray-800 ${isHighlighted ? "text-yellow-400 font-bold" : ""}`}>
                          {row.r}
                        </td>
                        <td className={`py-1 pr-4 border-b border-gray-800 text-green-400 font-bold ${isHighlighted ? "text-yellow-400 bg-yellow-500/30" : ""}`}>
                          {row.elev}
                        </td>
                        <td className={`py-1 border-b border-gray-800 ${isHighlighted ? "text-yellow-400 font-bold" : ""}`}>
                          {row.tof}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-[10px] text-gray-600">
          Based on M107 HE Shell Data (3000m - 5300m)
        </div>
      </div>
    </main>
  );
}
