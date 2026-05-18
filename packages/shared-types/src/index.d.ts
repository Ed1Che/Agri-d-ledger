export type Role = 'FARMER' | 'BUYER' | 'COOP_ADMIN' | 'REGULATOR' | 'SUPER_ADMIN';
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'DISPUTED';
export type ProduceStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';
export interface JwtPayload {
    sub: string;
    role: Role;
    scope: string[];
    iss: string;
    iat: number;
    exp: number;
}
export interface LoginRequest {
    phone: string;
    password: string;
}
export interface LoginResponse {
    requiresMfa: boolean;
    preAuthToken?: string;
    accessToken?: string;
    refreshToken?: string;
    scope?: string[];
}
export interface RegisterRequest {
    phone: string;
    password?: string;
    role: Role;
    cooperativeId?: string;
    nationalId?: string;
}
export interface ApiResponse<T = unknown> {
    data: T;
    meta?: PaginationMeta;
}
export interface ApiError {
    error: string;
    message: string;
    traceId?: string;
}
export interface PaginationMeta {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export interface UserProfile {
    id: string;
    phone: string;
    email?: string | null;
    role: Role;
    mfaEnabled: boolean;
    cooperativeId?: string | null;
    createdAt: string;
}
export interface Produce {
    id: string;
    farmerId: string;
    crop: string;
    gradeCode: string;
    weightKg: number;
    pricePerKg?: number | null;
    harvestDate: string;
    county: string;
    status: ProduceStatus;
    iotSensorId?: string | null;
    createdAt: string;
}
export interface CreateProduceRequest {
    crop: string;
    gradeCode: string;
    weightKg: number;
    harvestDate: string;
    county: string;
    cooperativeId?: string;
    iotSensorId?: string;
}
export interface Transaction {
    id: string;
    farmerId: string;
    buyerId: string;
    produceId: string;
    weightKg: number;
    pricePerKg: number;
    totalAmount: number;
    status: TransactionStatus;
    onChainHash?: string | null;
    blockNumber?: string | null;
    createdAt: string;
    confirmedAt?: string | null;
}
export interface CreateTransactionRequest {
    farmerId: string;
    produceId: string;
    weightKg: number;
    pricePerKg: number;
}
export interface LedgerEntry {
    id: string;
    transactionId: string;
    dataHash: string;
    onChainHash: string;
    blockNumber: string;
    contractAddress: string;
    anchoredAt: string;
}
export interface PricePredictionRequest {
    crop: string;
    county: string;
    weightKg: number;
    gradeCode: string;
}
export interface PricePredictionResponse {
    pricePerKg: number;
    confidence: number;
    model: string;
}
export interface CreditScoreResponse {
    score: number;
    tier: 'A' | 'B' | 'C' | 'D';
    eligible: boolean;
}
export interface USSDRequest {
    sessionId: string;
    serviceCode: string;
    phoneNumber: string;
    text: string;
    networkCode?: string;
}
export interface USSDResponse {
    text: string;
    isEnd: boolean;
}
export interface USSDFarmer {
    phone_number: string;
    name: string;
    location: string;
    farm_size?: string;
    is_verified: boolean;
    registered_at: string;
}
export interface USSDListing {
    listing_id: string;
    phone_number: string;
    crop_type: 'Maize' | 'Potatoes';
    quantity: number;
    unit: string;
    location?: string;
    asked_price: number;
    suggested_price?: number | null;
    status: 'pending' | 'verified' | 'sold' | 'expired';
    iot_verified: boolean;
    blockchain_recorded: boolean;
    listed_at: string;
}
export interface USSDListingUpdate {
    listingId: string;
    status: 'pending' | 'verified' | 'sold' | 'expired';
    suggestedPrice?: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}
export interface AnchorPayload {
    transactionId: string;
    dataHash: string;
}
export interface ProduceType {
    id: string;
    name: string;
    category: string;
    unit_of_measurement: string;
}
export interface FarmerProduce {
    id: string;
    farmer_id: string;
    produce_type_id: string;
    quantity_available: number;
    unit_of_measurement: string;
    asking_price_per_unit: number;
    harvest_date?: string | null;
    quality_grade: 'excellent' | 'good' | 'fair';
    notes?: string | null;
    produce_types?: Pick<ProduceType, 'name' | 'unit_of_measurement'>;
}
export interface RegionalBid {
    id: string;
    region: string;
    produce_type_id: string;
    average_price_per_unit: number;
    total_quantity_available: number;
    participating_farmers_count: number;
    negotiation_threshold_percentage: number;
    status: 'open' | 'closed' | 'approved';
    bid_close_date?: string | null;
    created_at: string;
}
export interface Bid {
    id: string;
    regional_bid_id: string;
    buyer_id: string;
    offered_price_per_unit: number;
    total_quantity_bid: number;
    bid_amount: number;
    negotiation_deviation_percentage: number;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
}
export interface BidConfirmation {
    id: string;
    bid_id: string;
    farmer_id: string;
    confirmation_status: 'pending' | 'confirmed' | 'rejected' | 'expired';
    confirmation_timestamp?: string | null;
    notification_method: string;
    bids?: Bid & {
        regional_bids?: Pick<RegionalBid, 'region'>;
    };
}
export interface Communication {
    id: string;
    sender_user_id: string;
    recipient_user_id: string;
    message_type: string;
    subject: string;
    message_content: string;
    bid_id?: string | null;
    regional_bid_id?: string | null;
    sent_timestamp: string;
    read_status: boolean;
}
//# sourceMappingURL=index.d.ts.map