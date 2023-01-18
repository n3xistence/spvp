/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/components/*.{html,js}"],
	theme: {
		extend: {
			animation: {
				"spin-slow": "spin 2s linear infinite",
			},
			scrollbar: {
				'scroll': 'overflow: scroll; -webkit-appearance: none;',
				'scrollbar': '::-webkit-scrollbar { width: 10px; background-color: #f5f5f5; } ::-webkit-scrollbar-thumb { background-color: #000000; }',
		  	},
		
		},
	},
	plugins: [require("flowbite/plugin")],
};
