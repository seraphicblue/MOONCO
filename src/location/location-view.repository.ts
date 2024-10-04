import { Injectable, Logger } from "@nestjs/common";
import { UserLocation } from "./location-view.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "nestjs-dynamoose";
import { NaverMapsClient } from "src/shared/infrastructure/database/navermap.config";
import { LocationType } from "./location.type";

export interface LocationView {
  locationId: string;
  userId: string;
  latitude: string;
  longitude: string;
  isCurrent: boolean;
  locationType: LocationType;
  isAgreed: boolean;
  updatedAt: Date;
}

@Injectable()
export class LocationViewRepository {

  private readonly logger = new Logger(LocationViewRepository.name);

  constructor(
    @InjectModel("LocationView")
    private readonly locationViewModel: Model<
      LocationView,
      { locationId: string }
    >,
    private readonly naverMapsClient: NaverMapsClient
  ) { }


  async create(locationView: LocationView): Promise<LocationView> {
    try {
      this.logger.log(`LocationView 생성 시도: ${locationView.locationId}`);

      // 기존 위치 정보를 비동기로 동시에 처리
      await Promise.all([
        this.findAlllocationbyuserId(locationView.userId),
        this.setAllLocationsToFalse(locationView.userId)
      ]);

      // 이미 존재하는지 확인
      const existingItem = await this.locationViewModel.get({ locationId: locationView.locationId });
      if (existingItem) {
        this.logger.warn(`LocationView already exists: ${locationView.locationId}`);
        return existingItem;
      }

      const item = await this.locationViewModel.create({
        ...locationView,
        latitude: locationView.latitude.toString(),
        longitude: locationView.longitude.toString(),
      });

      this.logger.log(`LocationView 생성 성공: ${item.locationId}`);
      return item;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        this.logger.warn(`LocationView 생성 조건 실패: ${locationView.locationId}`);
      } else {
        this.logger.error(`LocationView 생성 실패: ${error.message}`, error.stack);
        throw error;
      }
    }
  }


  //모두 X로 만드는 함수
  private async setAllLocationsToFalse(userId: string): Promise<void> {
    if (!userId) {
      this.logger.warn('유효하지 않은 userId로 setAllLocationsToFalse 호출됨');
      return;
    }

    try {
      const locations = await UserLocation.query("userId").eq(userId).exec();

      if (locations.length === 0) {
        this.logger.log(`${userId}에 대한 위치 정보가 없음`);
        return;
      }

      for (const location of locations) {
        await UserLocation.update({ locationId: location.locationId }, { isCurrent: false });
      }

      this.logger.log(`모든 위치를 false로 설정: ${userId}`);
    } catch (error) {
      this.logger.error(`위치 상태 업데이트 실패: ${error.message}`, error.stack);
      throw error;
    }
  }



  // 판매자ID로 상품 목록 조회
  async findAlllocationbyuserId(userId: string): Promise<LocationView[]> {
    try {
      this.logger.log(`LocationView 조회: userId=${userId}`);
      const results = await this.locationViewModel
        .query("userId")
        .eq(userId)
        .exec();
      return results;
    } catch (error) {
      this.logger.error(`LocationView 조회 실패: ${error.message}`, error.stack);
      return [];
    }
  }
  // 위치 정보 삭제
  async delete(userId: string): Promise<void> {
    try {
      this.logger.log(`LocationView 삭제: ${userId}`);
      await UserLocation.delete({ userId });
    } catch (error) {
      this.logger.error(`LocationView 삭제 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findCurrentLocation(userId: string): Promise<LocationView | null> {
    try {
      this.logger.log(`현재 위치 조회: ${userId}`);

      // 사용자 ID로 현재 위치 조회 (GSI 사용)
      const result = await this.locationViewModel
        .query("userId").eq(userId)
        .using("UserIdIndex")
        .filter("isCurrent").eq(true)
        .filter("isAgreed").eq(true)
        .exec();

      if (result.length === 0) {
        this.logger.warn(`사용자 ${userId}의 현재 위치 정보가 없습니다.`);
        return null;
      }

      const currentLocation = result[0];
      return {
        locationId: currentLocation.locationId,
        userId: currentLocation.userId,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        isCurrent: currentLocation.isCurrent,
        locationType: currentLocation.locationType,
        isAgreed: currentLocation.isAgreed,
        updatedAt: currentLocation.updatedAt,
      };
    } catch (error) {
      this.logger.error(`현재 위치 조회 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAllLocations(userId: string): Promise<Array<{ locationId: string; address: string; latitude: string; longitude: string }>> {
    try {
      this.logger.log(`Fetching all locations and reverse geocoding for user: ${userId}`);
      const result = await this.locationViewModel
        .query("userId").eq(userId)
        .using("UserIdIndex")
        .exec();

      this.logger.debug(`Found ${result.length} locations for user ${userId}`);

      const locations = await Promise.all(result.map(async (location: LocationView) => {
        try {
          this.logger.debug(`Reverse geocoding for location: ${location.locationId}, coords: ${location.latitude},${location.longitude}`);
          const address = await this.naverMapsClient.getReverseGeocode(location.latitude, location.longitude);
          return {
            locationId: location.locationId,
            address,
            latitude: location.latitude,
            longitude: location.longitude,
            isCurrent: location.isCurrent,
            locationType: location.locationType,
            isAgreed: location.isAgreed,
          };
        } catch (reverseGeocodingError) {
          this.logger.error(`Reverse geocoding failed for location ${location.locationId}: ${reverseGeocodingError.message}`);
          return {
            locationId: location.locationId,
            address: 'Address not found',
            latitude: location.latitude,
            longitude: location.longitude,
            isCurrent: location.isCurrent,
            locationType: location.locationType,
            isAgreed: location.isAgreed,
          };
        }
      }));

      return locations;
    } catch (error) {
      this.logger.error(`Failed to fetch all locations: ${error.message}`, error.stack);
      throw error;
    }
  }
}