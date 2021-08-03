import { data } from 'jquery';
import 'regenerator-runtime/runtime';

window.addEventListener('DOMContentLoaded', (event) => {
	// * - Global Variables
	// DOM Selectors
	const rewardsBody = document.querySelector('.rewards-wrapper');
	const rewardsForm = document.querySelector('#rewards-form');
	const submitBtn = rewardsForm.querySelector('#rewards-submit');
	const infoPanelWrapper = document.querySelector('.info-panel-wrapper');
	const quantityInputs = [...document.querySelectorAll('.product-qt')];
	const donatePoints = document.querySelector('#donate-points');
	const balanceWrapper = document.querySelector('.balance-wrapper');
	const totalField = balanceWrapper.querySelector('.balance');
	const variableContent = [...document.querySelectorAll('.variable-content')];
	const errorMsg = document.querySelector('.error-msg');
	const modal = document.getElementById('modal');

	// Global variables
	let userData;
	let rewardsTotal = 0;

	// * - Math Functions
	// Calculate item total
	function calculateItemPoints(e) {
		let input = e.currentTarget;
		let inputAmount = input.value;
		let inputValue = +input.parentNode.parentNode.querySelector('.value').dataset.value;
		let currentItemValue;

		currentItemValue = inputAmount * inputValue;
		updateItemTotalDOM(input, currentItemValue);
	};

	function updateItemTotalDOM(element, value) {
		let currentItemTotalDOM = element.parentNode.parentNode.querySelector('.total');

		// Set dataset value to the updated item value
		currentItemTotalDOM.dataset.value = value;

		if (value > 0) {
			// Add commas for DOM display
			let styledValue = numberWithCommas(value);

			// Display to DOM
			currentItemTotalDOM.innerText = styledValue;
		} else {
			currentItemTotalDOM.innerText = '';
		}

		// Calculate Total from dataset value
		calculateTotal();
	}

	// Calculate total of all items
	function calculateTotal() {
		const totals = [...document.querySelectorAll('td.total')];
		let totalsDataset = [];

		totals.forEach(total => {
			totalsDataset.push(+total.dataset.value);
		});

		rewardsTotal = totalsDataset.reduce((a, b) => a + b);

		updateBalanceDOM(rewardsTotal);
	}

	// Update balance at bottom of form
	function updateBalanceDOM(total) {
		total = rewardsForm.totalPoints.value - total;

		// Enable/disable submit button if total is acceptable
		if (total >= 0) {
			hideError();
			balanceWrapper.classList.remove('negative');
			enableSubmit();
		} else {
			showError('balance');
			balanceWrapper.classList.add('negative');
			disableSubmit();
		}

		total = numberWithCommas(total);

		totalField.innerText = total;
	}

	// Number with commas
	function numberWithCommas(x) {
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	// * - Populate form with data from getUser()
	// Populate hidden fields
	function populateHiddenFields(data) {
		// Set form based on if it's a company name or not
		if(!data.user.firstName && !data.user.lastName) {
			rewardsForm.firstName.value = data.user.companyFirstName;
			rewardsForm.lastName.value = data.user.companyLastName;
		} else {
			rewardsForm.firstName.value = data.user.firstName;
			rewardsForm.lastName.value = data.user.lastName;	
		}

		rewardsForm.accountNumber.value = data.user.accountNumber;
		rewardsForm.uuid.value = data.user._id;
		rewardsForm.companyName.value = data.user.companyName;
		rewardsForm.csr.value = data.user.rep;
		rewardsForm.totalPoints.value = +data.user.totalPoints;
	};

	// Populate client-facing account info
	function populateAccountInfo(data) {
		let companyNode;
		let nameNode;

		// Might have to do this again with the firstName folks
		if (data.user.companyName == true) {
			companyNode = `<li><span class="title">Company Name:</span><span class="def">${data.user.companyName}</span></li>`;
		} else {
			companyNode = '';
		}

		if (data.user.companyFirstName && data.user.companyLastName) {
			nameNode = `<li><span class="title">Account Name:</span><span class="def">${data.user.companyFirstName} ${data.user.companyLastName}</span></li>`;
		} else {
			nameNode = `<li><span class="title">Account Name:</span><span class="def">${data.user.firstName} ${data.user.lastName}</span></li>`;
		}

		const accountInfoHTML = `
				<ul class="info-panel">
					<li><span class="title">Account Number:</span><span class="def">${data.user.accountNumber}</span></li>
					<li><span class="title">Priority Number:</span><span class="def">${data.user.priorityNumber}</span></li>
					${nameNode}
					${companyNode}
				</ul>
				<ol class="rewards-tally">
					<li><span class="title">Tenure:</span><span class="def">${data.user.tenure}</span></li>
					<li><span class="title">Seat Quantity:</span><span class="def">${data.user.seatQt}</span></li>
					<li><span class="title">Price Level:</span><span class="def">${data.user.priceLevel}</span></li>
					<li><span class="title">Ticket Usage:</span><span class="def">${data.user.ticketUsage}</span></li>
					<li class="bonus"><span class="title">Rewards Bonus:</span><span class="def">${data.user.bonusPoints}</span></li>
					<li class="total"><span class="title">Total Points:</span><span class="def">${data.user.totalPoints}</span></li>
				</ol>
		`;

		infoPanelWrapper.insertAdjacentHTML('afterbegin', accountInfoHTML);
		totalField.innerText = numberWithCommas(data.user.totalPoints);
	};

	// Populate the donate points field
	function populateDonatePoints(data) {
		let donateValue = donatePoints.querySelector('.value');
		donateValue.setAttribute('data-value', data.user.totalPoints);
		donateValue.innerText = numberWithCommas(data.user.totalPoints);
	};

	// TODO - Set variable content items and fields
	function setVariableContent(data) {
		let userType = data.user.planType.toLowerCase();
		let premiumUser = userType.startsWith('premium');
		let standardUser = userType.startsWith('standard');

		if (premiumUser) {
			variableContent.forEach(element => {
				if(element.classList.contains('premium') === false) {
					element.remove();
				}
			})
		}

		if (standardUser) {
			variableContent.forEach(element => {
				if(element.classList.contains('regular') === false) {
					element.remove();
				}
			})
		}
	}

	// * - Async Functions - fetch user, submit request and init
	// Fetch user info from api
	async function getUser(id) {
		const response = await fetch(`https://rockets-rewards-server.herokuapp.com/api/${id}`);
		const data = await response.json();

		return data;
	};

	// Form submission
	async function submitRequest(e) {
		e.preventDefault();

		let formData = new FormData(rewardsForm);
		// https://rockets-rewards-server.herokuapp.com/submit-test
		// my ID - 60fc71b2a3bce5870dcce817
		fetch(`https://rockets-rewards-server.herokuapp.com/submit-test`, {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-type': 'application/json'
			},
			body: JSON.stringify(Object.fromEntries(formData))
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.error) {
					modal.innerHTML = `
					<div id="error">
						<h3>${data.error}</h3>
					</div>
				`;
					modal.classList.add('show-modal');
				} else if (data.status == 'ok') {
					modal.innerHTML = `
					<div id="success">
						<h3>Rockets Rewards submitted!</h3>
					</div>
				`;
					modal.classList.add('show-modal');
				}
			});
	};

	// Init function
	async function init() {
		const urlParams = new URLSearchParams(window.location.search);
		const userID = urlParams.get('id');

		if (userID) {
			userData = await getUser(userID);
			// console.log(userData);
			populateAccountInfo(userData);
			populateHiddenFields(userData);
			populateDonatePoints(userData);
			setVariableContent(userData);
			// Disable submit on page load to prevent submit errors
			disableSubmit();
		} else if (!userData) {
			rewardsBody.innerText = `Valid Rockets Rewards ID not found. If you believe you have received this message in error, please contact your customer service representative.`;
		};
	};

	// * - Error handlers
	// Show and hide errors
	function showError(msg) {
		errorMsg.classList.remove('hidden');

		if (msg == 'balance') {
			errorMsg.innerHTML = `<h3>You do not have enough Rockets Rewards Points to request the above items. Please adjust your request so that you have a remaining or zero balance. If you believe you have received this message in error, please contact your customer service rep.</h3>`;
		} else {
			errorMsg.innerHTML = `<h3>There is an error in the above request. Please try again.</h3>`;
		}
	};

	function hideError() {
		errorMsg.classList.add('hidden');
	};

	// Enable and disable submit button functions
	function enableSubmit() {
		submitBtn.classList.remove('disabled');
		rewardsForm.addEventListener('submit', submitRequest);
	};

	function disableSubmit() {
		submitBtn.classList.add('disabled');
		rewardsForm.removeEventListener('submit', submitRequest);
	}

	// * - Event Listeners
	// rewardsForm.addEventListener('submit', submitRequest);
	quantityInputs.forEach(input => {
		input.addEventListener('input', calculateItemPoints)
	});
	window.addEventListener('click', (e) => e.target == modal ? modal.classList.remove('show-modal') : false);

	// * - Call init function
	init();
});