
import React, { useState } from "react";

type Shift = {
	id: string;
	person: string;
	date: string; // YYYY-MM-DD
	start: string; // HH:MM
	end: string; // HH:MM
};

export const PlannerMainLayout: React.FC = () => {
	const [shifts, setShifts] = useState<Shift[]>([
		{ id: "1", person: "Anna", date: "2025-09-12", start: "08:00", end: "14:00" },
		{ id: "2", person: "Ben", date: "2025-09-12", start: "14:00", end: "20:00" },
	]);

	const [person, setPerson] = useState("");
	const [date, setDate] = useState("");
	const [start, setStart] = useState("");
	const [end, setEnd] = useState("");

	function addShift() {
		if (!person || !date || !start || !end) return;
		const newShift: Shift = {
			id: Date.now().toString(),
			person,
			date,
			start,
			end,
		};
		setShifts((s) => [newShift, ...s]);
		setPerson("");
		setDate("");
		setStart("");
		setEnd("");
	}

	function removeShift(id: string) {
		setShifts((s) => s.filter((sh) => sh.id !== id));
	}

	return (
		<div style={{ padding: 16, fontFamily: "Arial, sans-serif" }}>
			<h2>Einfacher Schichtplaner</h2>

			<div style={{ marginBottom: 12 }}>
				<input
					placeholder="Person"
					value={person}
					onChange={(e) => setPerson(e.target.value)}
					style={{ marginRight: 8 }}
				/>
				<input
					type="date"
					value={date}
					onChange={(e) => setDate(e.target.value)}
					style={{ marginRight: 8 }}
				/>
				<input
					type="time"
					value={start}
					onChange={(e) => setStart(e.target.value)}
					style={{ marginRight: 8 }}
				/>
				<input
					type="time"
					value={end}
					onChange={(e) => setEnd(e.target.value)}
					style={{ marginRight: 8 }}
				/>
				<button onClick={addShift}>Hinzufügen</button>
			</div>

			<ul style={{ padding: 0, listStyle: "none" }}>
				{shifts.map((s) => (
					<li key={s.id} style={{ marginBottom: 8, border: "1px solid #ddd", padding: 8, borderRadius: 4 }}>
						<div><strong>{s.person}</strong> — {s.date}</div>
						<div>{s.start} — {s.end}</div>
						<button onClick={() => removeShift(s.id)} style={{ marginTop: 6 }}>
							Entfernen
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
