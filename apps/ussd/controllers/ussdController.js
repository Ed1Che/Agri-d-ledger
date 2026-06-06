const supabase = require('../config/supabaseClient')

// ── Validation helpers ────────────────────────────────────────────────

const isValidNumber = (value) =>
  !isNaN(value) && Number(value) > 0

const isValidName = (value) =>
  value && value.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(value.trim())

const isValidLocation = (value) =>
  value && value.trim().length >= 2

const isValidMenuChoice = (value, options) =>
  options.includes(value.trim())

// ── Main USSD handler ─────────────────────────────────────────────────

const handleUssd = async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body

  // Guard: Africa's Talking sends empty string for the first request.
  // All subsequent inputs are '*'-delimited accumulated values.
  const textArray = text ? text.split('*') : ['']
  const userInput = textArray[textArray.length - 1].trim()
  let response = ''

  try {
    // ── Main menu ──────────────────────────────────────────────────────
    if (text === '') {
      response = `CON Welcome to Agri-D Ledger\n1. List Produce\n2. Check My Listings\n3. View Prices\n4. Register\n5. My Bids`

    // ─────────────────────────────────────────────────────────────────
    // Option 1: List Produce
    // ─────────────────────────────────────────────────────────────────

    } else if (text === '1') {
      response = `CON Select crop type:\n1. Maize\n2. Potatoes`

    } else if (textArray.length === 2 && textArray[0] === '1') {
      if (!isValidMenuChoice(userInput, ['1', '2'])) {
        response = `CON Invalid choice. Select crop type:\n1. Maize\n2. Potatoes`
      } else {
        const crops = { '1': 'Maize', '2': 'Potatoes' }
        response = `CON ${crops[userInput]} selected.\nEnter quantity (bags):`
      }

    } else if (textArray.length === 3 && textArray[0] === '1') {
      if (!isValidMenuChoice(textArray[1], ['1', '2'])) {
        response = `END Invalid crop selection. Please start again.`
      } else if (!isValidNumber(userInput)) {
        response = `CON Invalid quantity. Must be a number greater than 0.\nEnter quantity (bags):`
      } else if (Number(userInput) > 10000) {
        response = `CON Quantity too large. Maximum is 10,000 bags.\nEnter quantity (bags):`
      } else {
        response = `CON Enter your asking price per bag (KES):`
      }

    } else if (textArray.length === 4 && textArray[0] === '1') {
      const crops = { '1': 'Maize', '2': 'Potatoes' }
      const crop = crops[textArray[1]]
      const quantity = textArray[2]
      const price = userInput

      if (!isValidNumber(price)) {
        response = `CON Invalid price. Must be a number greater than 0.\nEnter price per bag (KES):`
      } else if (Number(price) < 100) {
        response = `CON Price too low. Minimum is KES 100.\nEnter price per bag (KES):`
      } else if (Number(price) > 100000) {
        response = `CON Price too high. Maximum is KES 100,000.\nEnter price per bag (KES):`
      } else {
        const total = (Number(quantity) * Number(price)).toLocaleString()
        response = `CON Summary:\nCrop: ${crop}\nQty: ${quantity} bags\nPrice: KES ${price}/bag\nTotal: KES ${total}\n\n1. Confirm\n2. Cancel`
      }

    } else if (textArray.length === 5 && textArray[0] === '1') {
      if (!isValidMenuChoice(userInput, ['1', '2'])) {
        response = `CON Invalid choice.\n1. Confirm\n2. Cancel`
      } else if (userInput === '1') {
        const crops = { '1': 'Maize', '2': 'Potatoes' }
        const crop = crops[textArray[1]]
        const quantity = textArray[2]
        const price = textArray[3]
        const listingId = `LST-${Date.now()}`

        const { error } = await supabase
          .from('produce_listings')
          .insert({
            listing_id: listingId,
            phone_number: phoneNumber,
            crop_type: crop,
            quantity: parseFloat(quantity),
            asked_price: parseFloat(price),
            status: 'pending',
          })

        if (error) {
          console.error('Listing insert error:', error.message)
          response = `END Something went wrong. Please try again.`
        } else {
          // Notify the Express API so ML/IoT modules can process the listing
          notifyApiOfListing(listingId, phoneNumber, crop, quantity, price).catch(
            (err) => console.error('API notify failed (non-fatal):', err.message)
          )
          response = `END Listing submitted!\nRef: ${listingId}\n\nYou will receive an SMS when a buyer is found.`
        }
      } else {
        response = `END Listing cancelled.`
      }

    // ─────────────────────────────────────────────────────────────────
    // Option 2: Check My Listings
    // ─────────────────────────────────────────────────────────────────

    } else if (text === '2') {
      const { data, error } = await supabase
        .from('produce_listings')
        .select('crop_type, quantity, asked_price, status')
        .eq('phone_number', phoneNumber)
        .order('listed_at', { ascending: false })
        .limit(3)

      if (error || !data || data.length === 0) {
        response = `END You have no listings yet.`
      } else {
        const list = data
          .map((l) => `${l.crop_type} - ${l.quantity} bags @ KES ${l.asked_price} - ${l.status}`)
          .join('\n')
        response = `END Your listings:\n${list}`
      }

    // ─────────────────────────────────────────────────────────────────
    // Option 3: View Prices (ML price checker)
    // ─────────────────────────────────────────────────────────────────

    } else if (text === '3') {
      response = `CON Select crop to check price:\n1. Maize\n2. Potatoes`

    } else if (textArray.length === 2 && textArray[0] === '3') {
      if (!isValidMenuChoice(userInput, ['1', '2'])) {
        response = `CON Invalid choice.\n1. Maize\n2. Potatoes`
      } else {
        const crops = { '1': 'maize', '2': 'potatoes' }
        const crop = crops[userInput]
        // Fetch the latest suggested price from recent verified listings
        const { data } = await supabase
          .from('produce_listings')
          .select('suggested_price, asked_price')
          .eq('crop_type', crop === 'maize' ? 'Maize' : 'Potatoes')
          .eq('status', 'verified')
          .order('listed_at', { ascending: false })
          .limit(5)

        if (!data || data.length === 0) {
          response = `END No recent price data for ${crop}.\nCheck back soon.`
        } else {
          const prices = data
            .map((r) => r.suggested_price ?? r.asked_price)
            .filter(Boolean)
          const avg = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0)
          response = `END ${crop.charAt(0).toUpperCase() + crop.slice(1)} prices:\nAvg market: KES ${avg}/bag\nBased on ${prices.length} recent listings`
        }
      }

    // ─────────────────────────────────────────────────────────────────
    // Option 4: Register
    // ─────────────────────────────────────────────────────────────────

    } else if (text === '4') {
      response = `CON Enter your full name:`

    } else if (textArray.length === 2 && textArray[0] === '4') {
      if (!isValidName(userInput)) {
        response = `CON Invalid name. Use letters only, min 2 characters.\nEnter your full name:`
      } else {
        response = `CON Enter your location (county/town):`
      }

    } else if (textArray.length === 3 && textArray[0] === '4') {
      const name = textArray[1].trim()
      const location = userInput

      if (!isValidLocation(location)) {
        response = `CON Invalid location. Min 2 characters.\nEnter your location:`
      } else {
        const { error } = await supabase
          .from('farmers')
          .upsert({
            phone_number: phoneNumber,
            name,
            location,
            is_verified: false,
          })

        if (error) {
          console.error('Registration error:', error.message)
          response = `END Registration failed. Please try again.`
        } else {
          response = `END Registration successful!\nName: ${name}\nLocation: ${location}\n\nWelcome to Agri-D Ledger!`
        }
      }

    // ─────────────────────────────────────────────────────────────────
    // Option 5: My Bids
    // ─────────────────────────────────────────────────────────────────

    } else if (text === '5') {
      const { data: farmer } = await supabase
        .from('farmers')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single()

      if (!farmer) {
        response = `END No farmer profile found.\nDial back and choose 4 to register.`
      } else {
        const { data: bids } = await supabase
          .from('bid_confirmations')
          .select('id, status, bids(buyer_price_per_unit, regional_bids(region))')
          .eq('farmer_id', farmer.id)
          .eq('status', 'pending')
          .limit(3)

        if (!bids || bids.length === 0) {
          response = `END No pending bids for your produce.`
        } else {
          const list = bids.map((b, i) => {
            const region = b.bids?.regional_bids?.region ?? 'Unknown'
            const price = b.bids?.buyer_price_per_unit ?? 0
            return `${i + 1}. ${region} KES ${price}/unit`
          }).join('\n')
          response = `CON Pending bids:\n${list}\n\nEnter number to confirm (0=skip):`
        }
      }

    } else if (textArray.length === 2 && textArray[0] === '5') {
      if (userInput === '0') {
        response = `END No action taken.`
      } else if (!isValidNumber(userInput) || Number(userInput) > 3) {
        response = `CON Invalid selection. Enter 1-3 or 0 to skip:`
      } else {
        const { data: farmer } = await supabase
          .from('farmers')
          .select('id')
          .eq('phone_number', phoneNumber)
          .single()

        const { data: bids } = await supabase
          .from('bid_confirmations')
          .select('id, bids(buyer_price_per_unit, regional_bids(region))')
          .eq('farmer_id', farmer.id)
          .eq('status', 'pending')
          .limit(3)

        const chosen = bids?.[Number(userInput) - 1]
        if (!chosen) {
          response = `END Bid not found. Please try again.`
        } else {
          const region = chosen.bids?.regional_bids?.region ?? 'Unknown'
          const price = chosen.bids?.buyer_price_per_unit ?? 0
          response = `CON Confirm bid from ${region}\nKES ${price}/unit?\n1. Accept\n2. Reject`
        }
      }

    } else if (textArray.length === 3 && textArray[0] === '5') {
      if (!isValidMenuChoice(userInput, ['1', '2'])) {
        response = `CON Invalid choice.\n1. Accept\n2. Reject`
      } else {
        const { data: farmer } = await supabase
          .from('farmers')
          .select('id')
          .eq('phone_number', phoneNumber)
          .single()

        const { data: bids } = await supabase
          .from('bid_confirmations')
          .select('id')
          .eq('farmer_id', farmer.id)
          .eq('status', 'pending')
          .limit(3)

        const chosen = bids?.[Number(textArray[1]) - 1]
        if (!chosen) {
          response = `END Session expired. Please try again.`
        } else {
          const newStatus = userInput === '1' ? 'accepted' : 'rejected'
          const { error } = await supabase
            .from('bid_confirmations')
            .update({ status: newStatus, responded_at: new Date().toISOString() })
            .eq('id', chosen.id)

          response = error
            ? `END Error updating bid. Try again.`
            : `END Bid ${newStatus}. You will receive an SMS confirmation shortly.`
        }
      }

    } else {
      response = `END Invalid option. Please try again.`
    }

  } catch (err) {
    console.error('USSD handler uncaught error:', err)
    response = `END A system error occurred. Please try again later.`
  }

  res.set('Content-Type', 'text/plain')
  res.send(response)
}

// ── Fire-and-forget: notify Express API so the ML module can price the listing
async function notifyApiOfListing(listingId, phoneNumber, cropType, quantity, askedPrice) {
  const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001'
  const secret = process.env.INTERNAL_API_SECRET || ''

  await fetch(`${apiUrl}/api/v1/ussd/new-listing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify({ listingId, phoneNumber, cropType, quantity, askedPrice }),
  })
}

module.exports = { handleUssd }
