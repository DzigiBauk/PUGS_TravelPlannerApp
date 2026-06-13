using AutoMapper;
using UserService.Models.Dtos;
using UserService.Models.Entities;

namespace UserService.Mapping;

public class UserProfile : Profile
{
    public UserProfile()
    {
        CreateMap<User, UserDto>();
        CreateMap<RegisterRequestDto, User>();
    }
}
